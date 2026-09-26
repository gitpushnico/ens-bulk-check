import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/retroui/Text";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What happens to the names you check.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <Text as="h1">Privacy</Text>
      <div className="flex max-w-2xl flex-col gap-4 text-lg leading-relaxed">
        <p>
          This site checks the names you paste in. There is no account, no wallet, and no cookie. The
          list is not saved after the answer comes back.
        </p>
        <p>
          The names go to this site, then to an Ethereum node so the registrar can be read. Unless
          the host is configured with a different address, that is ethereum.publicnode.com,
          eth.drpc.org, or 1rpc.io. Those services receive the names and keep their own logs. The
          answer is public chain data: status, price, expiry, and an owner address when the name
          has one.
        </p>
        <p>
          Vercel hosts the site and keeps ordinary request logs, including IP address, time, and
          browser. Vercel Analytics and Speed Insights are off. Copying names stays on your device.
          app.ens.domains and etherscan.io only see a visit if you open those links.
        </p>
        <p>Vercel and the Ethereum nodes may process this outside the EU.</p>
        <p>
          You can ask what is held about you, ask for a correction or deletion, or object. You can
          also complain to a data protection authority in the EU. Nicolaj Hasberg is responsible for
          this site. Write to{" "}
          <a href="mailto:hello@nicolaj.xyz" className="hover:underline">
            hello@nicolaj.xyz
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">26 September 2026</p>
      </div>
      <Link href="/" className="text-sm hover:underline">
        Back
      </Link>
    </main>
  );
}
