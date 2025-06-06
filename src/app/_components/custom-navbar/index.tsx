import { type ReactNode } from "react";
import { Avatar } from "../avatar";
import { redirect } from "next/navigation";
import {
	Dropdown,
	DropdownButton,
	DropdownDivider,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from "../dropdown";
import {
	Navbar,
	NavbarDivider,
	NavbarItem,
	NavbarLabel,
	NavbarSection,
	NavbarSpacer,
} from "../navbar";
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from "../sidebar";
import { StackedLayout } from "../stacked-layout";
import {
	ArrowRightStartOnRectangleIcon,
	ChevronDownIcon,
	Cog8ToothIcon,
	LightBulbIcon,
	PlusIcon,
	ShieldCheckIcon,
	UserIcon,
} from "@heroicons/react/16/solid";
import { InboxIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Heading } from "../heading";
import { Divider } from "../divider";
import { auth } from "~/server/auth";
import { ToastContainer } from "react-toastify";

const navItems = [
	{ label: "Home", url: "/" },
	{ label: "Provider", url: "/content" },
	{ label: "SLR", url: "/slr" },
	{ label: "Broadcasts", url: "/broadcasts" },
	{ label: "Settings", url: "/settings" },
];

function TeamDropdownMenu() {
	return (
		<DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
			<DropdownItem href="/teams/1/settings">
				<Cog8ToothIcon />
				<DropdownLabel>Settings</DropdownLabel>
			</DropdownItem>
			<DropdownDivider />
			<DropdownItem href="/teams/1">
				<Avatar slot="icon" src="/logo.svg" />
				<DropdownLabel>SLR Toolkit</DropdownLabel>
			</DropdownItem>
			<DropdownItem href="/teams/2">
				<Avatar
					slot="icon"
					initials="WC"
					className="bg-purple-500 text-white"
				/>
				<DropdownLabel>Workcation</DropdownLabel>
			</DropdownItem>
			<DropdownDivider />
			<DropdownItem href="/teams/create">
				<PlusIcon />
				<DropdownLabel>New team&hellip;</DropdownLabel>
			</DropdownItem>
		</DropdownMenu>
	);
}

export default async function CustomNavbar({
	children,
	title,
}: {
	children?: ReactNode;
	title: string;
}) {
	const session = await auth();
	if (!session?.user) {
		redirect("/api/auth/signin");
	}
	return (
		<StackedLayout
			navbar={
				<Navbar>
					<Dropdown>
						<DropdownButton as={NavbarItem} className="max-lg:hidden">
							<Avatar src="/logo.svg" />
							<NavbarLabel>SLR Toolkit</NavbarLabel>
							<ChevronDownIcon />
						</DropdownButton>
						<TeamDropdownMenu />
					</Dropdown>
					<NavbarDivider className="max-lg:hidden" />
					<NavbarSection className="max-lg:hidden">
						{navItems.map(({ label, url }) => (
							<NavbarItem key={label} href={url}>
								{label}
							</NavbarItem>
						))}
					</NavbarSection>
					<NavbarSpacer />
					<NavbarSection>
						<NavbarItem href="/search" aria-label="Search">
							<MagnifyingGlassIcon />
						</NavbarItem>
						<NavbarItem href="/inbox" aria-label="Inbox">
							<InboxIcon />
						</NavbarItem>
						<Dropdown>
							<DropdownButton as={NavbarItem}>
								<Avatar src="/pp.png" square />
							</DropdownButton>
							<DropdownMenu className="min-w-64" anchor="bottom end">
								<DropdownItem href="/my-profile">
									<UserIcon />
									<DropdownLabel>My profile</DropdownLabel>
								</DropdownItem>
								<DropdownItem href="/settings">
									<Cog8ToothIcon />
									<DropdownLabel>Settings</DropdownLabel>
								</DropdownItem>
								<DropdownDivider />
								<DropdownItem href="/privacy-policy">
									<ShieldCheckIcon />
									<DropdownLabel>Privacy policy</DropdownLabel>
								</DropdownItem>
								<DropdownItem href="/share-feedback">
									<LightBulbIcon />
									<DropdownLabel>Share feedback</DropdownLabel>
								</DropdownItem>
								<DropdownDivider />
								<DropdownItem href="/api/auth/signout">
									<ArrowRightStartOnRectangleIcon />
									<DropdownLabel>Sign out</DropdownLabel>
								</DropdownItem>
							</DropdownMenu>
						</Dropdown>
					</NavbarSection>
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<Dropdown>
							<DropdownButton as={SidebarItem} className="lg:mb-2.5">
								<Avatar src="/logo.svg" />
								<SidebarLabel>SLR Toolkit</SidebarLabel>
								<ChevronDownIcon />
							</DropdownButton>
							<TeamDropdownMenu />
						</Dropdown>
					</SidebarHeader>
					<SidebarBody>
						<SidebarSection>
							{navItems.map(({ label, url }) => (
								<SidebarItem key={label} href={url}>
									{label}
								</SidebarItem>
							))}
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			}
		>
			<Heading className="mb-2 sm:mb-4">{title}</Heading>
			<Divider className="mb-4 sm:mb-8" />
			{children}
			<ToastContainer
				stacked
				hideProgressBar
				position="bottom-right"
				className=""
			/>
		</StackedLayout>
	);
}
