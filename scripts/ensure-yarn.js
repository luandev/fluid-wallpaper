export function isYarnUserAgent(userAgent = "") {
  return userAgent.trim().toLowerCase().startsWith("yarn/");
}

export function yarnRequiredMessage() {
  return "This repository uses Yarn. Do not use npm, pnpm, or bun.\n  yarn install";
}

export function assertYarn(userAgent = process.env.npm_config_user_agent ?? "") {
  if (!isYarnUserAgent(userAgent)) {
    throw new Error(yarnRequiredMessage());
  }
}

const invokedDirectly = /scripts\/ensure-yarn\.js$/i.test(
  (process.argv[1] ?? "").replace(/\\/g, "/"),
);

if (invokedDirectly) {
  try {
    assertYarn();
  } catch (error) {
    console.error(error instanceof Error ? error.message : yarnRequiredMessage());
    process.exit(1);
  }
}
