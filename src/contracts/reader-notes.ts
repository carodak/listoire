export interface ReaderNotesPort {
  read(): Promise<string>;
  write(text: string): Promise<void>;
}
