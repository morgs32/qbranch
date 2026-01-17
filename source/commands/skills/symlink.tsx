import React, {useState, useEffect} from 'react';
import {Box} from 'ink';
import {Alert, Spinner} from '@inkjs/ui';
import {$} from 'zx';
import {
	access,
	lstat,
	mkdir,
	readdir,
	readlink,
	symlink,
} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';

const getRepoRoot = async (): Promise<string> => {
	const result = await $`git rev-parse --show-toplevel`;
	return result.stdout.trim();
};

const getSiblingQbranchPath = (repoRoot: string) =>
	join(dirname(repoRoot), 'qbranch');

type Status = 'loading' | 'success' | 'error';

export default function Symlink() {
	const [message, setMessage] = useState<string>('Initializing...');
	const [status, setStatus] = useState<Status>('loading');

	useEffect(() => {
		const run = async () => {
			try {
				const cwd = process.cwd();
				const packageJsonPath = join(cwd, 'package.json');
				const skillsDestination = join(cwd, 'skills');

				// Verify we're in a directory with package.json
				setMessage('Checking for package.json...');
				try {
					await access(packageJsonPath);
				} catch {
					setMessage(
						'Expected to run in a working directory with package.json',
					);
					setStatus('error');
					return;
				}

				// Find the qbranch repo (sibling to current repo)
				setMessage('Finding qbranch repository...');
				const repoRoot = await getRepoRoot();
				const qbranchPath = getSiblingQbranchPath(repoRoot);
				const skillsSource = join(qbranchPath, 'skills');

				// Verify skills source exists
				try {
					await access(skillsSource);
				} catch {
					setMessage(
						`Missing skills source directory at ${skillsSource}. Run 'init' first.`,
					);
					setStatus('error');
					return;
				}

				// Create skills destination directory
				setMessage('Creating skills directory...');
				await mkdir(skillsDestination, {recursive: true});

				// Read all entries from skills source
				setMessage('Reading skills...');
				const entries = await readdir(skillsSource, {withFileTypes: true});

				const linked: string[] = [];

				for (const entry of entries) {
					if (!entry.isDirectory()) {
						continue;
					}

					const sourcePath = join(skillsSource, entry.name);
					const destinationPath = join(skillsDestination, entry.name);

					setMessage(`Processing skill: ${entry.name}...`);

					// Check if destination already exists
					let destinationStat = null;
					try {
						destinationStat = await lstat(destinationPath);
					} catch (error) {
						if (
							typeof error === 'object' &&
							error !== null &&
							'code' in error &&
							(error as {code?: string}).code !== 'ENOENT'
						) {
							throw error;
						}
					}

					// If destination doesn't exist, create symlink
					if (!destinationStat) {
						await symlink(sourcePath, destinationPath, 'dir');
						linked.push(entry.name);
						continue;
					}

					// If it's not a symlink, skip it
					if (!destinationStat.isSymbolicLink()) {
						continue;
					}

					// Check if existing symlink points to the same place
					const existingTarget = await readlink(destinationPath);
					const resolvedExistingTarget = resolve(
						dirname(destinationPath),
						existingTarget,
					);
					const resolvedSource = resolve(sourcePath);

					if (resolvedExistingTarget !== resolvedSource) {
						continue;
					}
				}

				if (linked.length > 0) {
					setMessage(`Symlinked ${linked.length} skill(s): ${linked.join(', ')}`);
				} else {
					setMessage('All skills already symlinked');
				}

				setStatus('success');
			} catch (error) {
				setMessage(
					`Symlink error: ${error instanceof Error ? error.message : String(error)}`,
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
