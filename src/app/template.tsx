/** Fades each page in on navigation. Opacity only, so fixed-position children keep working. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
