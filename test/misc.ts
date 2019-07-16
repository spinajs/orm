import { join, normalize, resolve } from 'path';

export function dir(path: string) {
    return resolve(normalize(join(__dirname, path)));
}
