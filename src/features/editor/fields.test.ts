import type { ChangeEvent } from "react";
import { expect, it, vi } from "vitest";
import { uploadChosenFile } from "./Fields.tsx";

const change = (files: File[]) => {
  const input = { files, value: "C:\\fakepath\\clip.mp3" };
  return { input, event: { currentTarget: input } as unknown as ChangeEvent<HTMLInputElement> };
};

it("uploads the chosen file and clears the input once the upload settles", async () => {
  const file = new File(["x"], "clip.mp3");
  let finish!: () => void;
  const upload = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
  const { input, event } = change([file]);
  uploadChosenFile(upload)(event);
  expect(upload).toHaveBeenCalledWith(file);
  expect(input.value).not.toBe("");
  finish();
  await vi.waitFor(() => expect(input.value).toBe(""));
});

it("does nothing when the picker was cancelled", () => {
  const upload = vi.fn(async () => {});
  uploadChosenFile(upload)(change([]).event);
  expect(upload).not.toHaveBeenCalled();
});
