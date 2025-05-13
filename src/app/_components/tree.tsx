"use client";
import {
  Disclosure,
  DisclosurePanel,
  DisclosureButton,
} from "@headlessui/react";
import { useState } from "react";
import { ChevronRightIcon, NewspaperIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { Text } from "./text";
import { useMemo } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
export type CollectionResponse = {
  id: string;
  name: string;
  parentId?: string;
  numberOfItems?: number;
}[];
export interface TreeNode {
  name: string;
  current?: boolean;
  children?: TreeNode[];
  numberOfItems?: number;
  numberOfCollections?: number;
  id: string;
}

export default function Tree({
  data,
  onSubmit,
  selectedCollections,
}: {
  onSubmit?: (data: string[]) => Promise<void>;
  data: CollectionResponse;
  selectedCollections?: string[];
}) {

  const [selectedItems, setSelectedItems] = useState<string[]>(
    selectedCollections || [],
  );
  const nodes = useMemo(() => buildTree(data), [data]);
  const selectItem = (item: string) => {
    setSelectedItems((prev) => {
      const i = prev.indexOf(item);
      if (i < 0) {
        return [...prev, item];
      }
      return prev.filter((x) => x !== item);
    });
  };

  return (
    <>
      <ul role="tree" className="max-w-96 space-y-1">
        {nodes.map((node) => (
          <TreeItem
            selectedItems={selectedItems}
            onClick={selectItem}
            key={node.name}
            node={node}
          />
        ))}
      </ul>
      {onSubmit && (
        <Button onClick={async () => await onSubmit(selectedItems)}>
          {" "}
          Submit{" (" + selectedItems?.length + ")"}
        </Button>
      )}
    </>
  );
}

function buildTree(data: CollectionResponse): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  data.forEach(item => nodeMap.set(item.id, {
    ...item,
    children: []
  }));
  const tree: TreeNode[] = [];

  data.forEach(item => {
    const node = nodeMap.get(item.id)!;
    if (item.parentId && nodeMap.has(item.parentId)) {
      nodeMap.get(item.parentId)!.children!.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
}

const TrackCollectionBadge = ({
  id,
  amountPapers,
  onClick,
  selectedItems,
}: {
  id: string;
  amountPapers?: number;
  onClick?: (item: string) => void;
  selectedItems?: string[];
}) => {
  return (
    <Badge
      className="z-20 cursor-pointer"
      color={selectedItems?.includes(id) ? "teal" : undefined}
      onClick={() => {
        onClick?.(id);
      }}
    >
      <NewspaperIcon className="h-4 w-4" />
      {amountPapers ?? 0}
      {id}
    </Badge>
  );
};

function TreeItem({
  node,
  onClick,
  selectedItems,
}: {
  node: TreeNode;
  onClick: (item: string) => void;
  selectedItems: string[];
}) {
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
          <TrackCollectionBadge
            amountPapers={node.numberOfItems}
            id={node.id}
            onClick={onClick}
            selectedItems={selectedItems}
          />
        </div>
      </li>
    );
  }

  // Branch node (has children)
  return (
    <>
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
                <TrackCollectionBadge
                  amountPapers={node.numberOfItems}
                  id={node.id}
                  selectedItems={selectedItems}
                  onClick={onClick}
                />
              </div>

              <DisclosurePanel
                as="ul"
                className="ml-[9.5px] mt-1 space-y-1 border-l border-zinc-600 pl-2"
              >
                {node.children?.map((child) => (
                  <TreeItem
                    key={child.name}
                    node={child}
                    onClick={onClick}
                    selectedItems={selectedItems}
                  />
                ))}
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      </li>
    </>
  );
}
