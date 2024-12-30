import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { Inter } from "next/font/google";
import CustomNavbar from "./_components/custom-navbar";


const inter = Inter({ subsets: ["latin"] });
export default async function Home() {
  return (
    <HydrateClient>
      <main className={`${inter.className} `}>
        <CustomNavbar title="Dashboard"></CustomNavbar>
      </main>
    </HydrateClient>
  );
}
