/** Lets a held request go on as it would have: sent, or its response on to overrides, rules and the page. */
export async function goOn(): Promise<boolean> {
  return false;
}
