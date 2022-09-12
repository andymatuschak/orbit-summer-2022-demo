import { v4 as uuidv4 } from 'uuid';

// TODO: should we make this url-safe?
function uuidBase64(): string {
    const uuid = uuidv4();
    const encoded = btoa(uuid);
    return encoded;
}

export default uuidBase64;