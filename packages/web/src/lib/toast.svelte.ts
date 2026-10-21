/** One short message at a time, at the bottom of the page. */
export class Toast {
  text: string | null = $state(null);

  show(text: string): void {
    this.text = text;
  }

  close(): void {
    this.text = null;
  }
}
