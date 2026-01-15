import { Effect } from "effect";
import { program } from "./symlink-skills.js";

Effect.runFork(Effect.scoped(program()));
