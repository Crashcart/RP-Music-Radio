#!/usr/bin/env python3
"""
Seed example universes and sample DJs for new installations.

Usage:
    python scripts/seed-universes.py          # Add example data
    python scripts/seed-universes.py --clear  # Remove all examples
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.database import SessionLocal
from app.models.database import Universe, Artist


def _utcnow():
    return datetime.now(timezone.utc)


EXAMPLE_UNIVERSES = [
    {
        "name": "Cyberpunk 2077",
        "publisher": "CD Projekt Red",
        "setting": "Neo-Tokyo megacity",
        "era": "2077 (Futuristic)",
        "genre_hints": "synthwave|cyberpunk|electronic",
        "mood_hints": "dark|mysterious|energetic",
        "description": """
Night City, 2077. A sprawling megacity of neon signs, corpo towers, and back-alley deals.
Netrunners jack into the net. Mercs take jobs for credits. Fixers run the underground.
The streets pulse with synth music, hovercars blur past chrome-and-glass skyscrapers.
Tech is everything—implants, cyberware, neural links. The wealthy live in penthouses.
The poor hack together survival in favelas. Everywhere: crime, ambition, and rebellion.
Food: ramen noodles, street sushi, energy drinks. Places: bars, clubs, safe houses.
Factions: Arasaka Corporation, the Voodoo Boys, Militech, street gangs, fixers' networks.
""",
        "research_summary": "A dark, neon-soaked future where mega-corporations rule and street hackers hack and fight for survival. Cybernetic enhancement is ubiquitous. Electronic music dominates.",
        "djs": [
            {
                "name": "V",
                "display_name": "V",
                "artist_type": "dj",
                "personality": "Street-smart merc turned DJ, jaded but charismatic. Speaks with edge, refs contract killings and street jobs. Knows every hack and backdoor in Night City.",
                "voice_description": "Smooth, distorted, with synth-processed edges. Low and dangerous.",
                "catchphrases": "Stay frosty|Jack in|Time to build some rep",
                "genre": "synthwave|cyberpunk",
                "bio": "Used to take contracts. Now drops beats for the underground. Still dangerous.",
            },
            {
                "name": "Hex",
                "display_name": "Hex",
                "artist_type": "dj",
                "personality": "Netrunner turned broadcaster. Obsessed with glitch aesthetics and broken code. Speaks in tech slang mixed with street sass. References ICE, ports, and data theft.",
                "voice_description": "Rapid, glitchy, with digital artifacts and reverb.",
                "catchphrases": "Drop the firewall|Run the breach|Code's alive tonight",
                "genre": "cyberpunk|electronic",
                "bio": "Jacked in so deep she forgot the outside world. Now broadcasts from the net itself.",
            },
            {
                "name": "Phantom",
                "display_name": "Phantom",
                "artist_type": "dj",
                "personality": "Corpo defector, mysterious and guarded. Speaks of corporate espionage, the darker side of progress, and freedom. References classified operations.",
                "voice_description": "Deep, breathy, with subtle electronic distortion.",
                "catchphrases": "The system's watching|Trust no one|Burn the files",
                "genre": "dark|synthwave",
                "bio": "Used to sell weapons to megacorps. Now sells truth to the streets.",
            },
        ],
    },
    {
        "name": "The Witcher 3: Wild Hunt",
        "publisher": "CD Projekt Red",
        "setting": "Northern Kingdoms (Medieval Fantasy)",
        "era": "Medieval",
        "genre_hints": "fantasy|folk|ambient",
        "mood_hints": "mysterious|dark|epic",
        "description": """
A sprawling medieval fantasy world torn by war, monsters, and magic.
Witchers hunt beasts for coin. Sorceresses weave arcane power. Taverns overflow with tales.
The Witcher Geralt roams the Continent, sword and sign in hand, seeking equilibrium.
Food: mead, ale, hearty stew, grilled fish. Places: taverns, inns, monster dens, ancient ruins.
Factions: Nilfgaard, Northern Kingdoms, Scoia'tael, vampire covens, wild hunt.
Magic flows through the world—potions, curses, prophecies. Love and tragedy define legends.
The Continent is beautiful and brutal. Every choice carries weight. Death lurks in the fog.
""",
        "research_summary": "A dark medieval fantasy realm where monster hunting, political intrigue, and magical forces shape destiny. Epic, melancholic, and timeless.",
        "djs": [
            {
                "name": "Jaskier",
                "display_name": "Jaskier",
                "artist_type": "host",
                "personality": "Charming bard and storyteller. Weaves tales of Geralt's exploits and monster lore. Playful, poetic, occasionally drunk. Loves drama and legend.",
                "voice_description": "Warm, theatrical, with a hint of ale-soaked rasp.",
                "catchphrases": "Toss a coin|The tale continues|Monsters and men",
                "genre": "folk|ambient",
                "bio": "The legendary bard, now a voice in the tavern, keeping the stories alive.",
            },
            {
                "name": "Triss",
                "display_name": "Triss Merigold",
                "artist_type": "dj",
                "personality": "Sorceress turned broadcaster. Speaks of magic, prophecy, and the weight of destiny. Wise, enigmatic, protective of those she loves.",
                "voice_description": "Ethereal, with magical reverb and ancient knowledge.",
                "catchphrases": "Magic bends fate|Destinies entwine|The cards never lie",
                "genre": "fantasy|ambient",
                "bio": "A sorcerer's voice bridging the mortal and magical realms.",
            },
            {
                "name": "The Innkeeper",
                "display_name": "The Innkeeper",
                "artist_type": "host",
                "personality": "Weathered, world-weary tavern keeper. Knows everyone's secrets. Speaks of coin, contracts, and the gritty reality beneath heroic tales.",
                "voice_description": "Gravelly, aged, with the warmth of a tavern fire.",
                "catchphrases": "Aye, I remember that|Coin first, questions later|Drink your fill",
                "genre": "folk",
                "bio": "The keeper of tavern stories and silver-tongued negotiator.",
            },
        ],
    },
    {
        "name": "Elden Ring",
        "publisher": "FromSoftware",
        "setting": "The Lands Between (Cosmic Fantasy)",
        "era": "Timeless/Ancient",
        "genre_hints": "ambient|orchestral|dark",
        "mood_hints": "mysterious|epic|ominous",
        "description": """
A shattered world of cosmic power, broken grace, and endless struggle.
The Elden Ring is shattered. Demigods wage endless war. Tarnished wanderers seek the Throne.
Reality is fractured—poison swamps, burning erdtrees, gravity-defying chasms.
Runes are power. Death is a mechanic, not an ending. Time flows strangely.
Food: sacred tears, dried seaweed, mushroom stew. Places: underground cities, fortresses, tombs.
Factions: Goldmask, Ranni, Mohg, Radahn, Maliketh, Three Fingers, Outer Gods.
Magic is alien and cosmic. The world is beautiful and terrifying. Legends are written in blood.
""",
        "research_summary": "A dark, cosmic fantasy world where grace has been lost and demi-gods reign. Epic, mysterious, and steeped in eldritch horror and ancient power.",
        "djs": [
            {
                "name": "Melina",
                "display_name": "Melina",
                "artist_type": "dj",
                "personality": "Mysterious spirit guide, cryptic and poetic. Speaks of grace, the Elden Ring, and fate. Whispers truths wrapped in riddle.",
                "voice_description": "Ethereal, otherworldly, with hollow echoes.",
                "catchphrases": "Grace has been lost|The Ring was shattered|Accept the burden",
                "genre": "ambient|orchestral",
                "bio": "A voice from beyond, guiding the Tarnished through cosmic darkness.",
            },
            {
                "name": "The Shattered One",
                "display_name": "The Shattered One",
                "artist_type": "dj",
                "personality": "A Tarnished warrior, battle-worn and grim. Speaks of endless struggle, impossible odds, and the thrill of conquest. Obsessed with power and runes.",
                "voice_description": "Harsh, weary, with the echo of a thousand battles.",
                "catchphrases": "Shatter their grace|Become the Elden Lord|Blood will spill",
                "genre": "dark|orchestral",
                "bio": "One of countless Tarnished, forever seeking the throne.",
            },
            {
                "name": "Radagon",
                "display_name": "Radagon's Echo",
                "artist_type": "dj",
                "personality": "Regal, commanding, speaks of order, martial prowess, and the golden order. Authoritative and demanding. Obsessed with perfection.",
                "voice_description": "Deep, commanding, with cosmic distortion.",
                "catchphrases": "Order must be restored|Perfection demands blood|I am the law",
                "genre": "orchestral|epic",
                "bio": "The voice of cosmic order, eternal and unyielding.",
            },
        ],
    },
    {
        "name": "Fallout: New Vegas",
        "publisher": "Obsidian Entertainment",
        "setting": "Mojave Wasteland",
        "era": "Post-Apocalyptic (2281)",
        "genre_hints": "post-apocalyptic|retro|electronic",
        "mood_hints": "gritty|hopeful|chaotic",
        "description": """
The Mojave Wasteland, 2281. A desert of ruins, factions, and fragile hope.
The Great War ended civilization 200 years ago. Now, factions vie for control of the future.
NCR brings order but loses freedom. Caesar's Legion brings stability through slavery.
Independent Vegas thrives in the shadow of technology and vice.
Food: radroaches, mutated game, carefully preserved pre-war food. Places: casinos, bunkers, settlements.
Factions: New California Republic, Caesar's Legion, Brotherhood of Steel, Mr. House, Yes Man.
Technology is worshipped. Pre-war artifacts are treasures. The past haunts the present.
""",
        "research_summary": "A retro-futuristic post-apocalyptic world where 1950s nostalgia clashes with nuclear devastation. Factions battle for control while survivors carve meaning from ruins.",
        "djs": [
            {
                "name": "Three Dog",
                "display_name": "Three Dog",
                "artist_type": "host",
                "personality": "Enthusiastic radio host with a smooth jazz voice. Optimistic despite the wasteland. Speaks of heroes, adventure, and keeping the spirits up.",
                "voice_description": "Warm, vintage radio tone, smooth as pre-war whiskey.",
                "catchphrases": "Good news|Stay tuned|Heroes walk the wasteland",
                "genre": "retro|jazz",
                "bio": "The voice of hope in the darkness, spreading news of the Lone Wanderer.",
            },
            {
                "name": "Ranger",
                "display_name": "The Ranger",
                "artist_type": "dj",
                "personality": "Hardened NCR Ranger, cynical and weathered. Speaks of duty, survival, and the cost of order. Dry humor masks deep scars.",
                "voice_description": "Gravelly, tired, with dust and determination.",
                "catchphrases": "Stay sharp|The NCR holds the line|Another day in the wasteland",
                "genre": "post-apocalyptic|electronic",
                "bio": "A soldier's voice, broadcasting from the desert frontier.",
            },
            {
                "name": "Vera",
                "display_name": "Vera Keene",
                "artist_type": "dj",
                "personality": "Sultry Vegas showgirl turned DJ. Speaks of glamour, survival, and the illusion of pre-war paradise. Knows everyone's secrets.",
                "voice_description": "Sultry, vintage, with a hint of melancholy beneath the sass.",
                "catchphrases": "Welcome to Vegas|The show goes on|Luck is a fickle mistress",
                "genre": "retro|lounge",
                "bio": "The voice of Vegas nights, keeping the old spirit alive.",
            },
        ],
    },
]


def seed_universes():
    """Add example universes and DJs to the database."""
    db = SessionLocal()
    try:
        # Check if examples already exist
        existing = (
            db.query(Universe)
            .filter(Universe.name.in_([u["name"] for u in EXAMPLE_UNIVERSES]))
            .count()
        )

        if existing > 0:
            print(f"⚠️  {existing} example universe(s) already exist. Skipping seed.")
            print("   To clear examples, run: python scripts/seed-universes.py --clear")
            return

        for universe_data in EXAMPLE_UNIVERSES:
            # Extract DJs from the universe data
            dj_data = universe_data.pop("djs", [])

            # Create the universe
            universe = Universe(
                **universe_data,
                status="published",
                created_at=_utcnow(),
                updated_at=_utcnow(),
            )
            db.add(universe)
            db.flush()  # Get the ID

            # Create sample DJs for this universe
            for dj in dj_data:
                artist = Artist(
                    name=dj["name"],
                    display_name=dj.get("display_name", dj["name"]),
                    artist_type=dj.get("artist_type", "dj"),
                    bio=dj.get("bio", ""),
                    personality=dj.get("personality", ""),
                    voice_description=dj.get("voice_description", ""),
                    catchphrases=dj.get("catchphrases", ""),
                    genre=dj.get("genre", ""),
                    status="published",
                    created_at=_utcnow(),
                    updated_at=_utcnow(),
                )
                db.add(artist)

        db.commit()
        print("✅ Successfully seeded example universes!")
        print(
            f"   Added {len(EXAMPLE_UNIVERSES)} universes with {sum(len(u.get('djs', [])) for u in EXAMPLE_UNIVERSES)} sample DJs"
        )
        print("\n📻 Try these universes in the UI:")
        for u in EXAMPLE_UNIVERSES:
            print(f"   • {u['name']} ({u['publisher']})")
        print("\n🎤 Sample DJs have been created for each universe.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding universes: {e}")
        raise
    finally:
        db.close()


def clear_examples():
    """Remove all example universes and their DJs."""
    db = SessionLocal()
    try:
        example_names = [u["name"] for u in EXAMPLE_UNIVERSES]
        universes = db.query(Universe).filter(Universe.name.in_(example_names)).all()

        if not universes:
            print("ℹ️  No example universes found to remove.")
            return

        # Collect artist IDs from these universes
        artist_ids = []
        for universe in universes:
            artists = (
                db.query(Artist).filter(Artist.bio.like(f"%{universe.name}%")).all()
            )
            artist_ids.extend([a.id for a in artists])

        # Delete artists first
        for artist_id in artist_ids:
            artist = db.query(Artist).filter(Artist.id == artist_id).first()
            if artist:
                db.delete(artist)

        # Delete universes
        for universe in universes:
            db.delete(universe)

        db.commit()
        print(
            f"✅ Removed {len(universes)} example universe(s) and {len(artist_ids)} sample DJ(s)."
        )

    except Exception as e:
        db.rollback()
        print(f"❌ Error clearing examples: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if "--clear" in sys.argv:
        clear_examples()
    else:
        seed_universes()
