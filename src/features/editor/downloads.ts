export function download(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], {
      type: name.endsWith(".ink") ? "text/plain;charset=utf-8" : "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
