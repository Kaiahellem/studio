import { LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ds/button";
import { Icon } from "@/components/ds/icon";
import { logout } from "@/features/auth/actions";
import { t } from "@/i18n/nb";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className={`${buttonVariants.ghost} -mx-3 w-[calc(100%+1.5rem)] justify-start`}>
        <Icon icon={LogOut} />
        {t.common.logout}
      </button>
    </form>
  );
}
