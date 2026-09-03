export interface ModoHandle {
  confirm: () => void;
  hint: () => void;
  skip?: () => void;
  hintsUsed?: number;
  hintsMax?: number;
  canConfirm?: boolean;
  finalized?: boolean;
  bottomCenter?: () => null;
}
