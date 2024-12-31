import React, { type ReactNode } from "react";
import { Navbar, NavbarItem, NavbarSection } from "./navbar";

interface Tab {
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  currentTabIndex: number;
}

export default function Tabs({ tabs, currentTabIndex }: TabsProps) {
  return (
    <>
      <Navbar>
        <NavbarSection>
          {tabs.map((tab, i) => (
            <NavbarItem
              key={i}
              href={`?tabIndex=${i}`}
              current={i === currentTabIndex}
            >
              {tab.label}
            </NavbarItem>
          ))}
        </NavbarSection>
      </Navbar>

      <div className="p-4">{tabs[currentTabIndex]?.content}</div>
    </>
  );
}
