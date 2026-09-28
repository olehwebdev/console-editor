/**
 * A connection to the browser driven with a profile: the one the app launched before, if it is still open (the app was
 * restarted, or let go of it), else one launched now. A browser already open with that profile would take a second
 * launch's address itself, and never open a debugging port for it.
 */
export async function reachOrLaunch<C>(read: () => Promise<string | null>, connect: (address: string) => Promise<C>, launch: () => Promise<string>): Promise<C> {
  const running = await read();
  const reached = running ? await connect(running).catch(() => null) : null;
  return reached ?? connect(await launch());
}
