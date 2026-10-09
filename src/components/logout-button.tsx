import { logout } from "@/features/auth/actions";
import { t } from "@/i18n/nb";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="text-sm underline underline-offset-4 hover:no-underline">
        {t.common.logout}
      </button>
    </form>
  );
}
