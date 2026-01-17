declare module 'ink-testing-library' {
	import type {ReactElement} from 'react';

	type RenderResult = {
		lastFrame(): string | undefined;
		frames: string[];
	};

	export function render(node: ReactElement): RenderResult;
}
