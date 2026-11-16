/** Reads one trimmed text field from a form. Kept free of Next imports so it can be unit tested. */
export const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
