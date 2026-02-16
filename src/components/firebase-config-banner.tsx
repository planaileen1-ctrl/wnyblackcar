import { firebaseConfigError } from "@/lib/firebase-config";

export default function FirebaseConfigBanner() {
  if (!firebaseConfigError) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-400/40 bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-100 backdrop-blur">
      Firebase configuration is incomplete. Booking and admin updates are disabled until env vars are set.
    </div>
  );
}