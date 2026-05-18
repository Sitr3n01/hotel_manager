export function QueuedNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
      role="status"
    >
      {message}
    </p>
  );
}
