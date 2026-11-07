import { isObject } from "./validation.ts";

export type PackageJson = {
  scripts?: unknown;
  devEngines?: unknown;
  packageManager?: unknown;
};

export async function readPackageJson(
  packageFile = `package.json`,
): Promise<PackageJson> {
  const json: unknown = await Deno.readTextFile(packageFile)
    .catch((_) => {
      throw new Error(`failed to read '${packageFile}'`);
    })
    .then((data) => JSON.parse(data));

  if (!isObject(json)) {
    throw new Error(`expected an object in '${packageFile}'`);
  }
  return json;
}
