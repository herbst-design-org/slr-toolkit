import { type ReactNode, type ReactElement } from "react";
import { Button } from "./button";
import type { ButtonProps } from "./button";

type HeadlessButtonPropsWithLoadingAndChildren = ButtonProps & {
	children: ReactNode;
	loading: boolean;
};

export default function LoadingButton({
	loading,
	children,
	...rest
}: HeadlessButtonPropsWithLoadingAndChildren): ReactElement {
	return (
		<Button {...rest}>
			{loading ? (
				<div className="loader">
					<div className="inner one"></div>
					<div className="inner two"></div>
					<div className="inner three"></div>
				</div>
			) : (
				children
			)}
		</Button>
	);
}
