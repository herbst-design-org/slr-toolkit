"use client";
import {
  Disclosure,
  DisclosurePanel,
  DisclosureButton,
} from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { Text } from "./text";
import type { CollectionResponse } from "~/server/api/routers/content/ContentProvider";
import { useMemo } from "react";

export interface TreeNode {
  name: string;
  href?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  current?: boolean;
  children?: TreeNode[];
}

interface TreeProps {
  nodes: TreeNode[];
}

export default function Tree({ data }: { data: CollectionResponse }) {
  const nodes = useMemo(() => buildTree(data), [data]);

  return (
    <ul role="tree" className="space-y-1">
      {nodes.map((node) => (
        <TreeItem key={node.name} node={node} />
      ))}
    </ul>
  );
}

function buildTree(data: CollectionResponse): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

  data.forEach((item) => {
    nodeMap.set(item.id, { name: item.name, children: [] });
  });

  const tree: TreeNode[] = [];

  data.forEach((item) => {
    if (item.parentCollection) {
      const parentNode = nodeMap.get(item.parentCollection);
      if (parentNode) {
        parentNode.children = parentNode.children ?? [];
        parentNode.children.push(nodeMap.get(item.id)!);
      }
    } else {
      tree.push(nodeMap.get(item.id)!);
    }
  });

  return tree;
}

function TreeItem({ node }: { node: TreeNode }) {
  const Icon = node.icon; // If provided

  // Leaf node (no children)
  if (!node.children) {
    return (
      <li>
        <Text
          className={clsx(
            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-700",
          )}
        >
          {Icon && <Icon className="h-5 w-5 shrink-0 text-gray-400" />}
          {node.name}
        </Text>
      </li>
    );
  }

  // Branch node (has children)
  return (
    <li>
      <Disclosure as="div">
        {({ open }) => (
          <>
            <DisclosureButton
              className={clsx(
                node.current ? "bg-gray-50" : "hover:bg-gray-50",
                "group flex w-full items-center gap-x-3 rounded-md p-2 text-left text-sm font-semibold text-gray-700",
              )}
            >
              {Icon && <Icon className="h-5 w-5 shrink-0 text-gray-400" />}
              <Text>{node.name} </Text>
              <ChevronRightIcon
                className={clsx(
                  "ml-auto h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200",
                  open && "rotate-90 text-gray-500",
                )}
              />
            </DisclosureButton>

            <DisclosurePanel as="ul" className="mt-1 space-y-1 pl-8">
              {node.children?.map((child) => (
                <TreeItem key={child.name} node={child} />
              ))}
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </li>
  );
}
