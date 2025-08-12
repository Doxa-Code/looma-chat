import { createLoader, parseAsString } from "nuqs/server";

export const defaultParams = {
  workspaceId: parseAsString,
};

export const loadDefaultParams = createLoader(defaultParams);
