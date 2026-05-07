"""
Synthesis Task — the full generation pipeline as a Celery task.

Pipeline steps:
  1. Load draft from DB
  2. Resolve persona & station DNA (get-or-create voice/style seeds)
  3. Generate script via Gemini
  4. Generate audio via Lyria
  5. Generate album art via Nano Banana 2
  6. Imprint metadata into MP3 via Mutagen
  7. Record completion in GenerationHistory
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.tasks import celery_app
from app.database import SessionLocal
from app.models.database import Draft, GenerationHistory

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="synthesize_track")
def synthesize_track(self, draft_id: str) -> dict:
    """
    Full synthesis pipeline for a single draft.

    Uses self.update_state() to push progress updates that the
    /tasks/{task_id} endpoint can read in real-time.
    """
    db = SessionLocal()

    try:
        # ── Step 0: Load draft ────────────────────────────────────
        draft = db.query(Draft).filter(Draft.id == draft_id).first()
        if draft is None:
            raise ValueError(f"Draft {draft_id} not found")

        draft.status = "generating"
        db.commit()

        # Create history record
        history = GenerationHistory(
            draft_id=draft_id,
            task_id=self.request.id,
            station_name=draft.station_name,
            artist_name=draft.artist_name,
            genre=draft.genre,
            status="generating",
        )
        db.add(history)
        db.commit()

        # ── Step 1: Resolve DNA ───────────────────────────────────
        self.update_state(
            state="PROGRESS", meta={"stage": "resolving_dna", "progress": 10}
        )

        from app.utils.dna_manager import DNAManager

        dna = DNAManager()
        persona = dna.get_or_create_persona(draft.artist_name)
        station = dna.get_or_create_station(draft.station_name, mood=draft.mood)

        history.voice_seed = persona.voice_seed
        history.style_seed = station.style_seed
        db.commit()

        # ── Step 2: Generate script via Gemini ────────────────────
        self.update_state(
            state="PROGRESS", meta={"stage": "generating_script", "progress": 25}
        )

        from app.integrations.gemini_client import GeminiClient

        gemini = GeminiClient()
        script_result = gemini.generate_script(
            station_name=draft.station_name,
            artist_name=draft.artist_name,
            genre=draft.genre,
            mood=draft.mood,
            items=draft.items,
            backstory=persona.backstory,
            habits=persona.habits,
            filler_enabled=draft.filler_protocol,
        )

        # Update draft with generated script if it was empty
        if not draft.script:
            draft.script = script_result.get("script", "")
            draft.backstory = script_result.get("backstory", draft.backstory)
            draft.market_research = script_result.get(
                "market_research", draft.market_research
            )
            db.commit()

        track_title = script_result.get(
            "track_title", f"{draft.station_name} - {draft.artist_name}"
        )
        history.track_title = track_title
        db.commit()

        # ── Step 3: Generate audio via Lyria ──────────────────────
        self.update_state(
            state="PROGRESS", meta={"stage": "generating_audio", "progress": 50}
        )

        from app.utils.audio_generator import AudioGenerator, AudioType

        audio_gen = AudioGenerator()
        audio_path, license_info = audio_gen.generate(
            AudioType.FULL_TRACK,
            station=station,
            persona=persona,
            track_title=track_title,
            genre=draft.genre,
            script=draft.script,
        )

        # ── Step 4: Generate art via Nano Banana 2 ────────────────
        self.update_state(
            state="PROGRESS", meta={"stage": "generating_art", "progress": 70}
        )

        from app.utils.art_generator import ArtGenerator, ArtType

        art_gen = ArtGenerator()
        art_path = art_gen.generate(
            ArtType.ALBUM_COVER,
            station=station,
            persona=persona,
            track_title=track_title,
            genre=draft.genre,
        )

        # ── Step 5: Imprint metadata into MP3 ─────────────────────
        self.update_state(
            state="PROGRESS", meta={"stage": "imprinting", "progress": 85}
        )

        if audio_path:
            from app.utils.mutagen_handler import imprint
            from app.models.persona import LoreLedger

            lore_ledger = LoreLedger(
                backstory=draft.backstory,
                market_research=draft.market_research,
                voice_id=persona.voice_seed,
                style_seed=station.style_seed,
                genre=draft.genre,
                station=draft.station_name,
                filler_protocol_applied=draft.filler_protocol,
            )

            imprint(
                audio_path,
                artist_name=draft.artist_name,
                station_name=draft.station_name,
                track_title=track_title,
                script_text=draft.script,
                lore_ledger=lore_ledger,
                art_path=art_path,
            )

        # ── Step 6: Update records ────────────────────────────────
        self.update_state(
            state="PROGRESS", meta={"stage": "finalizing", "progress": 95}
        )

        # Update persona history
        persona.history.append(track_title)
        persona.total_tracks_generated += 1
        dna.update_persona(persona)

        # Update history record
        history.output_path = str(audio_path) if audio_path else None
        history.art_path = str(art_path) if art_path else None
        history.status = "completed"
        history.completed_at = datetime.now(timezone.utc)

        # Update draft status
        draft.status = "completed"
        db.commit()

        logger.info("Synthesis complete for draft %s → %s", draft_id, audio_path)

        return {
            "draft_id": draft_id,
            "status": "completed",
            "output_path": str(audio_path) if audio_path else None,
            "track_title": track_title,
        }

    except Exception as exc:
        logger.error("Synthesis failed for draft %s: %s", draft_id, exc, exc_info=True)

        # Update records to reflect failure
        try:
            draft = db.query(Draft).filter(Draft.id == draft_id).first()
            if draft:
                draft.status = "failed"

            history = (
                db.query(GenerationHistory)
                .filter(GenerationHistory.task_id == self.request.id)
                .first()
            )
            if history:
                history.status = "failed"
                history.error_message = str(exc)

            db.commit()
        except Exception as cleanup_err:
            logger.warning(
                "Failed to log synthesis error to DB: %s", cleanup_err, exc_info=True
            )

        raise

    finally:
        db.close()
