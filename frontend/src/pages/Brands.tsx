import { useState, useEffect } from "react";
import { api, type Brand } from "../api/client";

export function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selected, setSelected] = useState<Brand | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [genLogo, setGenLogo] = useState<string | null>(null);

  const refresh = () => {
    api
      .listBrands()
      .then(setBrands)
      .catch((e) => console.error("Failed to load brands:", e));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleGenLogo = async (id: string) => {
    setGenLogo(id);
    try {
      await api.generateBrandLogo(id);
      refresh();
      if (selected?.id === id) {
        api
          .getBrand(id)
          .then(setSelected)
          .catch((e: Error) =>
            console.error("Failed to reload brand after logo:", e),
          );
      }
    } catch (e: unknown) {
      alert(
        `Logo generation failed: ${e instanceof Error ? e.message : "Check your API key"}`,
      );
    } finally {
      setGenLogo(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand?")) return;
    try {
      await api.deleteBrand(id);
      if (selected?.id === id) setSelected(null);
      refresh();
    } catch (e: any) {
      alert(`Failed to delete brand: ${e.message || String(e)}`);
    }
  };

  if (showCreate) {
    return (
      <div>
        <div className="page-header">
          <h2>🏢 New Brand</h2>
        </div>
        <BrandForm
          onCancel={() => setShowCreate(false)}
          onSave={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      </div>
    );
  }

  if (showEdit && selected) {
    return (
      <div>
        <div className="page-header">
          <h2>🏢 Edit: {selected.name}</h2>
        </div>
        <BrandForm
          existing={selected}
          onCancel={() => setShowEdit(false)}
          onSave={() => {
            setShowEdit(false);
            refresh();
            api
              .getBrand(selected.id)
              .then(setSelected)
              .catch((e) => console.error("Failed to reload brand:", e));
          }}
        />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <div className="page-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
            }}
          >
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>
              ← Back
            </button>
            <div>
              <h2>🏢 {selected.name}</h2>
              <p>{selected.slogan || selected.industry}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>
              Edit
            </button>
            <button
              className="btn btn-ghost"
              style={{ color: "var(--status-failed)" }}
              onClick={() => handleDelete(selected.id)}
            >
              Delete
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="card">
            <div
              className="card-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 className="card-title">🏢 Brand Logo</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleGenLogo(selected.id)}
                disabled={genLogo === selected.id}
                title="Regenerate brand logo"
              >
                {genLogo === selected.id ? "⏳" : "🔄"}
              </button>
            </div>
            <div
              style={{
                padding: "var(--space-md)",
                minHeight: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected.logo_path ? (
                <img
                  src={selected.logo_path}
                  alt={`${selected.name} logo`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "200px",
                    borderRadius: "var(--border-radius)",
                  }}
                />
              ) : (
                <p
                  style={{
                    color: "var(--text-secondary)",
                    textAlign: "center",
                  }}
                >
                  🏢 No logo yet. Click 🔄 to generate one.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Brand Identity</h3>
            </div>
            <div className="detail-fields">
              <DetailField label="Name" value={selected.name} />
              <DetailField label="Slogan" value={selected.slogan} />
              <DetailField label="Industry" value={selected.industry} />
              <DetailField label="Tone" value={selected.tone} />
              <DetailField
                label="Target Audience"
                value={selected.target_audience}
              />
              <DetailField label="Ad Style" value={selected.ad_style} />
              <DetailField label="Reputation" value={selected.reputation} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Products</h3>
            </div>
            {selected.products ? (
              <div
                className="entity-card-tags"
                style={{ flexWrap: "wrap", gap: "var(--space-sm)" }}
              >
                {selected.products.split("|").map((p, i) => (
                  <span key={i} className="tag">
                    {p.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No products listed</p>
            )}
            {selected.description && (
              <p
                style={{
                  color: "var(--text-secondary)",
                  marginTop: "var(--space-md)",
                  lineHeight: 1.7,
                }}
              >
                {selected.description}
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Lore & History</h3>
            </div>
            <div className="detail-fields">
              <DetailField label="Founded" value={selected.founded_year} />
              <DetailField label="Headquarters" value={selected.headquarters} />
              <DetailField
                label="Controversies"
                value={selected.controversies}
              />
              <DetailField label="Notes" value={selected.lore_notes} />
            </div>
          </div>

          {(selected.color_primary || selected.color_secondary) && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Brand Colors</h3>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-md)",
                  alignItems: "center",
                }}
              >
                {selected.color_primary && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-md)",
                        background: selected.color_primary,
                        border: "2px solid var(--border)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {selected.color_primary}
                    </span>
                  </div>
                )}
                {selected.color_secondary && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-md)",
                        background: selected.color_secondary,
                        border: "2px solid var(--border)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {selected.color_secondary}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🏢 Brands & Sponsors</h2>
          <p>Fictional in-universe companies that sponsor your stations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Brand
        </button>
      </div>

      {brands.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: "var(--space-xxl)" }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>
            🏢
          </div>
          <h3 style={{ color: "var(--text-primary)" }}>No brands yet</h3>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            Create fictional brands for in-universe ads and sponsorships.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Brand
          </button>
        </div>
      ) : (
        <div className="entity-grid">
          {brands.map((b) => (
            <div
              key={b.id}
              className="card entity-card"
              onClick={() => setSelected(b)}
            >
              <div
                className="entity-card-art"
                style={{
                  background: b.color_primary
                    ? `linear-gradient(135deg, ${b.color_primary}, ${b.color_secondary || b.color_primary})`
                    : undefined,
                }}
              >
                {b.logo_path ? (
                  <img src={b.logo_path} alt={b.name} />
                ) : (
                  <div className="entity-card-placeholder">🏢</div>
                )}
              </div>
              <div className="entity-card-info">
                <h3>{b.name}</h3>
                {b.slogan && (
                  <span className="entity-card-sub">{b.slogan}</span>
                )}
                <div className="entity-card-tags">
                  {b.industry && <span className="tag">{b.industry}</span>}
                  {b.tone && <span className="tag">{b.tone}</span>}
                  {b.reputation && <span className="tag">{b.reputation}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Brand Form ──────────────────────────────────────────────────── */

function BrandForm({
  existing,
  onCancel,
  onSave,
}: {
  existing?: Brand;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    slogan: existing?.slogan || "",
    industry: existing?.industry || "",
    description: existing?.description || "",
    tone: existing?.tone || "",
    target_audience: existing?.target_audience || "",
    ad_style: existing?.ad_style || "",
    products: existing?.products || "",
    product_descriptions: existing?.product_descriptions || "",
    color_primary: existing?.color_primary || "",
    color_secondary: existing?.color_secondary || "",
    founded_year: existing?.founded_year || "",
    headquarters: existing?.headquarters || "",
    reputation: existing?.reputation || "",
    controversies: existing?.controversies || "",
    lore_notes: existing?.lore_notes || "",
  });
  const [saving, setSaving] = useState(false);

  const set =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Brand name is required");
    setSaving(true);
    try {
      if (existing) {
        await api.updateBrand(existing.id, form);
      } else {
        await api.createBrand(form);
      }
      onSave();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <h3 className="card-title">
          🏢 {existing ? "Edit Brand" : "New Brand"}
        </h3>
      </div>

      <div className="form-section">
        <div className="form-section-title">Brand Identity</div>
        <div className="form-row">
          <FormField
            label="Brand Name *"
            value={form.name}
            onChange={set("name")}
            placeholder="Nexus Dynamics"
          />
          <FormField
            label="Slogan"
            value={form.slogan}
            onChange={set("slogan")}
            placeholder="Taste the Nebula"
          />
        </div>
        <div className="form-row">
          <FormSelect
            label="Industry"
            value={form.industry}
            onChange={set("industry")}
            options={[
              "",
              "food",
              "weapons",
              "medicine",
              "technology",
              "entertainment",
              "transportation",
              "energy",
              "mining",
              "fashion",
              "finance",
              "security",
              "real-estate",
              "other",
            ]}
          />
          <FormSelect
            label="Reputation"
            value={form.reputation}
            onChange={set("reputation")}
            options={[
              "",
              "trusted",
              "shady",
              "cult-like",
              "prestigious",
              "underground",
              "controversial",
              "beloved",
              "feared",
            ]}
          />
        </div>
        <FormTextarea
          label="Description"
          value={form.description}
          onChange={set("description")}
          placeholder="What does this brand do? What do they sell? What's their deal?"
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">Advertising Voice</div>
        <div className="form-row">
          <FormSelect
            label="Tone"
            value={form.tone}
            onChange={set("tone")}
            options={[
              "",
              "corporate",
              "quirky",
              "sinister",
              "wholesome",
              "aggressive",
              "mysterious",
              "enthusiastic",
              "deadpan",
              "luxurious",
            ]}
          />
          <FormField
            label="Target Audience"
            value={form.target_audience}
            onChange={set("target_audience")}
            placeholder="space truckers, corporate drones"
          />
        </div>
        <FormSelect
          label="Ad Style"
          value={form.ad_style}
          onChange={set("ad_style")}
          options={[
            "",
            "infomercial",
            "testimonial",
            "jingle",
            "PSA",
            "narrative",
            "comparison",
            "celebrity-endorsement",
            "fear-based",
          ]}
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">Products</div>
        <FormField
          label="Products (pipe-separated)"
          value={form.products}
          onChange={set("products")}
          placeholder="Fusion Core|Med-Kit|Plasma Ammo|NanoShield"
        />
        <FormTextarea
          label="Product Details"
          value={form.product_descriptions}
          onChange={set("product_descriptions")}
          placeholder="Detailed descriptions of each product — used by AI to write ad copy..."
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">Visual Identity</div>
        <div className="form-row">
          <FormField
            label="Primary Color"
            value={form.color_primary}
            onChange={set("color_primary")}
            placeholder="#ff006e"
          />
          <FormField
            label="Secondary Color"
            value={form.color_secondary}
            onChange={set("color_secondary")}
            placeholder="#7b2ff7"
          />
        </div>
        {(form.color_primary || form.color_secondary) && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-md)",
              marginTop: "var(--space-sm)",
            }}
          >
            {form.color_primary && (
              <div
                style={{
                  width: 60,
                  height: 30,
                  borderRadius: "var(--radius-sm)",
                  background: form.color_primary,
                  border: "1px solid var(--border)",
                }}
              />
            )}
            {form.color_secondary && (
              <div
                style={{
                  width: 60,
                  height: 30,
                  borderRadius: "var(--radius-sm)",
                  background: form.color_secondary,
                  border: "1px solid var(--border)",
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="form-section-title">Lore & History</div>
        <div className="form-row">
          <FormField
            label="Founded"
            value={form.founded_year}
            onChange={set("founded_year")}
            placeholder="2145"
          />
          <FormField
            label="Headquarters"
            value={form.headquarters}
            onChange={set("headquarters")}
            placeholder="Mars Colony Alpha"
          />
        </div>
        <FormTextarea
          label="Controversies"
          value={form.controversies}
          onChange={set("controversies")}
          placeholder="In-universe scandals, lawsuits, cover-ups..."
        />
        <FormTextarea
          label="Lore Notes"
          value={form.lore_notes}
          onChange={set("lore_notes")}
          placeholder="Additional worldbuilding details..."
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : existing ? "Save Changes" : "Create Brand"}
        </button>
      </div>
    </div>
  );
}

/* ── Shared helpers ──────────────────────────────────────────────── */

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function fieldId(label: string) {
  return label
    .toLowerCase()
    .replace(/[\s*/\\]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+$/, "");
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const id = fieldId(label);
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="form-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="on"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  const id = fieldId(label);
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        className="form-input form-textarea"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        autoComplete="on"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  const id = fieldId(label);
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        className="form-input"
        value={value}
        onChange={onChange}
        autoComplete="on"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "— Select —"}
          </option>
        ))}
      </select>
    </div>
  );
}
