import {
  AttachmentID,
  encodeUUIDBytesToWebSafeBase64ID,
  TaskID,
} from "@withorbit/core";
import { parse as uuidParse, v5 as uuidV5 } from "uuid";

let _orbitPrototypeNamespaceUUID: ArrayLike<number> | null = null;

export function generateOrbitIDForString<ID extends TaskID | AttachmentID>(
  input: string,
): ID {
  if (!_orbitPrototypeNamespaceUUID) {
    _orbitPrototypeNamespaceUUID = uuidParse(
      "432a94d7-56d3-4d17-adbd-685c97b5c67a",
    );
  }
  const bytes = new Uint8Array(16);
  uuidV5(input, _orbitPrototypeNamespaceUUID, bytes);
  return encodeUUIDBytesToWebSafeBase64ID(bytes) as ID;
}
