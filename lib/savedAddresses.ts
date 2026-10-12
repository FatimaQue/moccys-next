export type SavedAddress = { label: string; address: string };

// Saved addresses live in the account's own editable metadata, so read them defensively: keep only well-formed
// entries, trim the text and cap the list, whatever is actually stored there.
export function readSavedAddresses(raw: unknown): SavedAddress[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is SavedAddress => !!a && typeof a.label === "string" && typeof a.address === "string" && !!a.address.trim())
    .slice(0, 10)
    .map((a) => ({ label: a.label.trim().slice(0, 30), address: a.address.trim().slice(0, 250) }));
}
