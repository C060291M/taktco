"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { ChevronDown, Star, Trash2, Copy, Plus, Download, Upload, Search } from "lucide-react";

type Item = {
  id: string; name: string; description: string | null; unit: string; price: string | number;
  taxable: boolean; active: boolean; favorite: boolean; notes: string | null; categoryId: string;
};
type Category = { id: string; name: string; description: string | null; active: boolean; items: Item[] };
type Question = { id: string; question: string; answerType: string; active: boolean };

export function PricingMatrixClient({
  initialCategories, initialQuestions, canManage, tradeType
}: { initialCategories: Category[]; initialQuestions: Question[]; canManage: boolean; tradeType: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [questions, setQuestions] = useState(initialQuestions);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initialCategories.map((c) => c.id)));
  const [search, setSearch] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkPercent, setBulkPercent] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; unit: string; categoryName: string }[] | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function loadStarterTemplate() {
    setLoadingTemplate(true);
    const res = await fetch("/api/pricing/load-starter-template", { method: "POST" });
    setLoadingTemplate(false);
    if (res.ok) {
      toast.success("Starter template loaded - edit everything to match your real pricing.");
      refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't load template.");
    }
  }

  async function requestAiSuggestions() {
    setSuggestLoading(true);
    setSuggestError(null);
    const res = await fetch("/api/pricing/suggest", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({})
    });
    const data = await res.json().catch(() => ({}));
    setSuggestLoading(false);
    if (res.ok) {
      setAiSuggestions(data.suggestions || []);
      setSelectedSuggestions(new Set((data.suggestions || []).map((_: unknown, i: number) => i)));
    } else if (data.error === "INSUFFICIENT_CREDITS") {
      setSuggestError("Not enough AI credits for this. Check Settings -> TAKTCO AI.");
    } else {
      setSuggestError(data.error || "Couldn't get suggestions.");
    }
  }

  async function approveSuggestions() {
    if (!aiSuggestions) return;
    const toApprove = aiSuggestions.filter((_, i) => selectedSuggestions.has(i));
    if (toApprove.length === 0) return;
    const res = await fetch("/api/pricing/suggest/approve", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suggestions: toApprove })
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Added ${data.created} item${data.created === 1 ? "" : "s"} at $0 - set real prices before using them.`);
      setAiSuggestions(null);
      refresh();
    } else {
      toast.error("Couldn't add items");
    }
  }

  async function addCategory() {
    const name = prompt("Category name:");
    if (!name) return;
    const res = await fetch("/api/pricing/categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name })
    });
    if (res.ok) { toast.success("Category added"); refresh(); }
    else toast.error("Couldn't add category");
  }

  async function addItem(categoryId: string) {
    const name = prompt("Item name:");
    if (!name) return;
    const unit = prompt("Unit (e.g. each, hour, linear foot):", "each") || "each";
    const priceStr = prompt("Price:", "0") || "0";
    const price = Number(priceStr);
    if (isNaN(price)) { toast.error("Invalid price"); return; }
    const res = await fetch("/api/pricing/items", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, name, unit, price })
    });
    if (res.ok) { toast.success("Item added"); refresh(); }
    else toast.error("Couldn't add item");
  }

  async function updateItemPrice(item: Item, newPrice: number) {
    const res = await fetch(`/api/pricing/items/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price: newPrice })
    });
    if (res.ok) refresh();
    else toast.error("Couldn't update price");
  }

  async function toggleFavorite(item: Item) {
    await fetch(`/api/pricing/items/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite: !item.favorite })
    });
    refresh();
  }

  async function toggleItemActive(item: Item) {
    await fetch(`/api/pricing/items/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !item.active })
    });
    refresh();
  }

  async function deleteItem(item: Item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await fetch(`/api/pricing/items/${item.id}`, { method: "DELETE" });
    toast.success("Item deleted");
    refresh();
  }

  async function duplicateItem(item: Item) {
    await fetch(`/api/pricing/items/${item.id}/duplicate`, { method: "POST" });
    refresh();
  }

  async function duplicateCategory(category: Category) {
    await fetch(`/api/pricing/categories/${category.id}/duplicate`, { method: "POST" });
    refresh();
  }

  async function deleteCategory(category: Category) {
    if (!confirm(`Delete "${category.name}" and all ${category.items.length} items in it?`)) return;
    await fetch(`/api/pricing/categories/${category.id}`, { method: "DELETE" });
    refresh();
  }

  async function applyBulkPercent() {
    const percent = Number(bulkPercent);
    if (isNaN(percent) || selectedItems.size === 0) return;
    const res = await fetch("/api/pricing/items/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: Array.from(selectedItems), action: "price_percent_change", percent })
    });
    if (res.ok) {
      toast.success(`Adjusted ${selectedItems.size} item price${selectedItems.size === 1 ? "" : "s"}`);
      setSelectedItems(new Set());
      setBulkPercent("");
      refresh();
    }
  }

  function exportCsv() {
    window.location.href = "/api/pricing/items/export";
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await fetch("/api/pricing/items/import", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: text })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(`Imported ${data.imported} items${data.errors?.length ? `, ${data.errors.length} rows skipped` : ""}`);
      refresh();
    } else {
      toast.error(data.error || "Import failed");
    }
    e.target.value = "";
  }

  async function addQuestion() {
    const question = prompt("Estimating question (e.g. \"Will demolition be required?\"):");
    if (!question) return;
    const res = await fetch("/api/pricing/questions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, answerType: "YES_NO" })
    });
    if (res.ok) { refresh(); } else toast.error("Couldn't add question");
  }

  async function deleteQuestion(id: string) {
    await fetch(`/api/pricing/questions/${id}`, { method: "DELETE" });
    refresh();
  }

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    items: search
      ? cat.items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()))
      : cat.items
  }));

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

  if (totalItems === 0 && categories.length === 0 && canManage) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-white font-medium">Your Pricing Matrix is empty</p>
        <p className="text-sm text-graphite-400 max-w-md mx-auto">
          Load a starter template to get going faster, or build your own from scratch below. Everything in a template is a
          placeholder you're expected to edit - not real industry pricing.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button className="btn-primary" disabled={loadingTemplate} onClick={loadStarterTemplate}>
            {loadingTemplate ? "Loading..." : `Load ${tradeType || "General"} starter template`}
          </button>
          <button className="btn-secondary" onClick={addCategory}>Start from scratch</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500" />
          <input className="input pl-8" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canManage && (
          <>
            <button className="btn-secondary text-xs flex items-center gap-1" onClick={addCategory}><Plus size={13} /> Category</button>
            <button className="btn-secondary text-xs flex items-center gap-1" onClick={requestAiSuggestions} disabled={suggestLoading}>
              {suggestLoading ? "Thinking..." : "✨ Improve with AI"}
            </button>
            <button className="btn-secondary text-xs flex items-center gap-1" onClick={exportCsv}><Download size={13} /> Export CSV</button>
            <label className="btn-secondary text-xs flex items-center gap-1 cursor-pointer">
              <Upload size={13} /> Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={importCsv} />
            </label>
          </>
        )}
      </div>

      {suggestError && <p className="text-xs text-red-400">{suggestError}</p>}

      {aiSuggestions && (
        <div className="card p-4 border-accent/40 bg-accent/5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white font-medium">AI-suggested items to add</p>
            <button className="text-xs text-graphite-500 hover:text-white" onClick={() => setAiSuggestions(null)}>Dismiss</button>
          </div>
          <p className="text-[11px] text-graphite-500">
            Names and units only — no prices are suggested. Approved items are added at $0; you set the real price.
          </p>
          <div className="space-y-1">
            {aiSuggestions.map((s, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSuggestions.has(i)}
                  onChange={() => setSelectedSuggestions((prev) => {
                    const next = new Set(prev);
                    next.has(i) ? next.delete(i) : next.add(i);
                    return next;
                  })}
                />
                <span className="text-graphite-200">{s.name}</span>
                <span className="text-graphite-500 text-xs">({s.unit} — {s.categoryName})</span>
              </label>
            ))}
          </div>
          <button className="btn-primary text-xs" onClick={approveSuggestions} disabled={selectedSuggestions.size === 0}>
            Add {selectedSuggestions.size} selected item{selectedSuggestions.size === 1 ? "" : "s"}
          </button>
        </div>
      )}

      {selectedItems.size > 0 && canManage && (
        <div className="card p-3 flex items-center gap-2 border-accent/40 bg-accent/5">
          <span className="text-xs text-graphite-300">{selectedItems.size} selected</span>
          <input className="input w-24 text-xs" placeholder="% change" value={bulkPercent} onChange={(e) => setBulkPercent(e.target.value)} />
          <button className="btn-secondary text-xs" onClick={applyBulkPercent}>Apply price change</button>
          <button className="text-xs text-graphite-500 hover:text-white ml-auto" onClick={() => setSelectedItems(new Set())}>Clear selection</button>
        </div>
      )}

      <div className="space-y-3">
        {filteredCategories.map((category) => (
          <div key={category.id} className="card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-graphite-800/60"
              onClick={() => setExpanded((prev) => {
                const next = new Set(prev);
                next.has(category.id) ? next.delete(category.id) : next.add(category.id);
                return next;
              })}
            >
              <span className="flex items-center gap-2 text-white font-medium text-sm">
                <ChevronDown size={15} className={`transition-transform ${expanded.has(category.id) ? "" : "-rotate-90"}`} />
                {category.name}
                <span className="text-graphite-500 text-xs font-normal">({category.items.length})</span>
              </span>
              {canManage && (
                <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button className="text-graphite-500 hover:text-white" onClick={() => duplicateCategory(category)} title="Duplicate category"><Copy size={14} /></button>
                  <button className="text-graphite-500 hover:text-red-400" onClick={() => deleteCategory(category)} title="Delete category"><Trash2 size={14} /></button>
                </span>
              )}
            </button>

            {expanded.has(category.id) && (
              <div className="border-t border-graphite-700">
                {category.items.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-graphite-500">No items yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {category.items.map((item) => (
                        <tr key={item.id} className={`border-b border-graphite-700 last:border-0 ${!item.active ? "opacity-50" : ""}`}>
                          {canManage && (
                            <td className="pl-4 py-2 w-6">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={() => setSelectedItems((prev) => {
                                  const next = new Set(prev);
                                  next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                                  return next;
                                })}
                              />
                            </td>
                          )}
                          <td className="py-2 pl-2">
                            <button onClick={() => canManage && toggleFavorite(item)} className="text-graphite-500 hover:text-amber-400">
                              <Star size={13} fill={item.favorite ? "currentColor" : "none"} className={item.favorite ? "text-amber-400" : ""} />
                            </button>
                          </td>
                          <td className="py-2 px-2 text-graphite-100">{item.name}</td>
                          <td className="py-2 px-2 text-graphite-400 text-xs">{item.unit}</td>
                          <td className="py-2 px-2 text-graphite-200 text-right">
                            {canManage ? (
                              <input
                                className="input w-24 text-right text-xs py-1"
                                type="number"
                                defaultValue={Number(item.price)}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (!isNaN(val) && val !== Number(item.price)) updateItemPrice(item, val);
                                }}
                              />
                            ) : (
                              `$${Number(item.price).toLocaleString()}`
                            )}
                          </td>
                          {canManage && (
                            <td className="py-2 px-2 text-right space-x-2 whitespace-nowrap">
                              <button className="text-graphite-500 hover:text-white" onClick={() => toggleItemActive(item)}>{item.active ? "Deactivate" : "Activate"}</button>
                              <button className="text-graphite-500 hover:text-white" onClick={() => duplicateItem(item)}><Copy size={13} /></button>
                              <button className="text-graphite-500 hover:text-red-400" onClick={() => deleteItem(item)}><Trash2 size={13} /></button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {canManage && (
                  <button className="w-full text-left px-4 py-2 text-xs text-accent hover:underline" onClick={() => addItem(category.id)}>
                    + Add item
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-white">Estimating questions</h2>
          {canManage && <button className="text-xs text-accent hover:underline" onClick={addQuestion}>+ Add question</button>}
        </div>
        <p className="text-xs text-graphite-500 mb-3">Asked before the AI drafts an estimate - answers are passed to the AI as context.</p>
        {questions.length === 0 ? (
          <p className="text-xs text-graphite-500">No estimating questions yet.</p>
        ) : (
          <div className="space-y-1">
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-graphite-200">{q.question}</span>
                {canManage && <button className="text-graphite-500 hover:text-red-400" onClick={() => deleteQuestion(q.id)}><Trash2 size={13} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
