import React, {useState, useEffect} from 'react';
import {Box} from 'ink';
import {Alert, Spinner} from '@inkjs/ui';
import {$} from 'zx';
import {access, readdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';

const DEFAULT_QBRANCH_REPO = 'https://github.com/morgs32/qbranch.git';

export const isDefault = true;

const pathExists = async (targetPath: string) => {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
};

const getRepoRoot = async (): Promise<string> => {
	const result = await $`git rev-parse --show-toplevel`;
	return result.stdout.trim();
};

const getSiblingQbranchPath = (repoRoot: string) =>
	join(dirname(repoRoot), 'qbranch');

type Status = 'loading' | 'success' | 'error';

export default function Init() {
	const [message, setMessage] = useState<string>('Initializing...');
	const [status, setStatus] = useState<Status>('loading');

	useEffect(() => {
		const run = async () => {
			try {
				// Get the current repo root
				setMessage('Finding repository root...');
				const repoRoot = await getRepoRoot();

				const siblingPath = getSiblingQbranchPath(repoRoot);
				const siblingGitPath = join(siblingPath, '.git');

				// Check if sibling qbranch repo already exists
				if (await pathExists(siblingGitPath)) {
					setMessage(
						`qbranch repo already exists at ${siblingPath}. Running install...`,
					);
				} else {
					// Check if the directory exists but isn't a git repo
					const siblingExists = await pathExists(siblingPath);
					if (siblingExists) {
						const entries = await readdir(siblingPath);
						if (entries.length > 0) {
							setMessage(
								`Found ${siblingPath} but it is not a git repo. Move it or clone qbranch elsewhere.`,
							);
							setStatus('error');
							return;
						}
					}

					// Clone the repo
					setMessage(`Cloning qbranch from ${DEFAULT_QBRANCH_REPO}...`);
					const repoParent = dirname(repoRoot);
					await $({
						cwd: repoParent,
						stdio: 'inherit',
					})`git clone ${DEFAULT_QBRANCH_REPO} ${siblingPath}`;
				}

				// Run pnpm install
				setMessage('Running pnpm install...');
				await $({cwd: siblingPath, stdio: 'inherit'})`pnpm i`;

				// Run pnpm link
				setMessage('Running pnpm link...');
				await $({cwd: siblingPath, stdio: 'inherit'})`pnpm link`;

				setMessage(`Successfully initialized qbranch at ${siblingPath}`);
				setStatus('success');
			} catch (error) {
				setMessage(
					`Init error: ${error instanceof Error ? error.message : String(error)}`,
				);
				setStatus('error');
			}
		};

		void run();
	}, []);

	if (status === 'error') {
		return (
			<Box>
				<Alert variant="error">{message}</Alert>
			</Box>
		);
	}

	if (status === 'success') {
		return (
			<Box>
				<Alert variant="success">{message}</Alert>
			</Box>
		);
	}

	return (
		<Box>
			<Spinner label={message} />
		</Box>
	);
}
