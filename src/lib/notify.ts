import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models/Notification";
import { User } from "@/lib/models/User";
import { sendMail } from "@/lib/mail";

export async function pushNotification(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  email?: boolean;
}) {
  await connectDB();
  await Notification.create({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    href: opts.href || "",
    read: false,
  });

  if (!opts.email) return;

  const user = await User.findById(opts.userId).select(
    "email name notifyCashout notifyOffers notifyNewsletter",
  );
  if (!user?.email) return;

  const allow =
    opts.type.startsWith("cashout")
      ? user.notifyCashout !== false
      : opts.type.startsWith("offer")
        ? user.notifyOffers !== false
        : true;

  if (!allow) return;

  await sendMail({
    to: user.email,
    subject: opts.title,
    text: `${opts.body}\n\n— EarnFlow`,
    html: `<p>Hi ${user.name || "there"},</p><p>${opts.body}</p><p style="color:#64748b">— EarnFlow</p>`,
  });
}
