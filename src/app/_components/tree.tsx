"use client";
import {
  Disclosure,
  DisclosurePanel,
  DisclosureButton,
} from "@headlessui/react";
import { ChevronRightIcon, NewspaperIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { Text } from "./text";
import type { CollectionResponse } from "~/server/api/routers/content/ContentProvider";
import { useMemo } from "react";
import { Badge } from "./badge";

export interface TreeNode {
  name: string;
  current?: boolean;
  children?: TreeNode[];
  numberOfItems?: number;
  numberOfCollections?: number;
}

export default function Tree({ data }: { data: CollectionResponse }) {
  const nodes = useMemo(() => buildTree(data), [data]);
  return (
    <ul role="tree" className="max-w-96 space-y-1">
      {nodes.map((node) => (
        <TreeItem key={node.name} node={node} />
      ))}
    </ul>
  );
}

function buildTree(data: CollectionResponse): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  console.log({ data, nodeMap });

  data.forEach((item) => {
    nodeMap.set(item.id, {
      name: item.name,
      children: [],
      numberOfItems: item.numberOfItems,
    });
  });

  const tree: TreeNode[] = [];

  data.forEach((item) => {
    if (item.parentId) {
      const parentNode = nodeMap.get(item.parentId);
      console.log({ parentNode });
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

const TrackCollectionBadge = ({
  id,
  amountPapers,
}: {
  id: string;
  amountPapers?: number;
}) => {
  return (
    <Badge
      className="z-20 cursor-pointer"
      onClick={() => {
        console.log(id);
      }}
    >
      <NewspaperIcon className="h-4 w-4" />
      {amountPapers ?? 0}
    </Badge>
  );
};

function TreeItem({ node }: { node: TreeNode }) {
  // Leaf node (no children)
  if (!node.children?.length) {
    return (
      <li className="">
        <div className="flex items-center">
          <Text
            className={clsx(
              "group flex gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-700",
            )}
          >
            {node.name}
          </Text>
          <TrackCollectionBadge amountPapers={node.numberOfItems} id="x" />
        </div>
      </li>
    );
  }

  // Branch node (has children)
  return (
    <li>
      <Disclosure as="div">
        {({ open }) => (
          <>
            <div className="flex items-center">
              <DisclosureButton
                className={clsx(
                  "group flex items-center text-left text-sm font-semibold text-gray-700",
                )}
              >
                <ChevronRightIcon
                  className={clsx(
                    "h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200",
                    open && "rotate-90 text-gray-500",
                  )}
                />

                <Text
                  className={clsx(
                    "group flex gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-700",
                  )}
                >
                  {node.name}
                </Text>
              </DisclosureButton>
              <TrackCollectionBadge amountPapers={node.numberOfItems} id="x" />
            </div>

            <DisclosurePanel
              as="ul"
              className="ml-[9.5px] mt-1 space-y-1 border-l border-zinc-600 pl-2"
            >
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
