import { ReactNode } from "react";
import ScrollWheel from "./ScrollWheel";
import TactileButton from "./TactileButton";
import NeonHintLamp from "./NeonHintLamp";
import { ChevronRight, RotateCcw, Settings2 } from "lucide-react";

interface Props {
  // Hint
  hintsUsed: number;
  onHint: () => void;
  hintDisabled?: boolean;
  // Confirm
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  confirmHidden?: boolean;
  // Wheel
  onWheelTick?: (dir: 1 | -1) => void;
  // Next (visible after answering)
  onNext?: () => void;
  showNext?: boolean;
  // Center area (input field, etc.)
  center?: ReactNode;
}

export default function ConsolePanel({
  hintsUsed, onHint, hintDisabled,
  onConfirm, confirmLabel = "Confirmar", confirmDisabled, confirmHidden,
  onWheelTick, onNext, showNext, center,
}: Props) {
  return (
    <div className="console-surface p-4 md:p-5">
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 md:gap-5 items-center">
        {/* Esquerda: rodinha + lâmpada */}
        <div className="flex items-center gap-3 md:gap-4">
          <ScrollWheel color="blue" onTick={onWheelTick} label="Nav" size={78} />
          <NeonHintLamp used={hintsUsed} onClick={onHint} disabled={hintDisabled} />
        </div>

        {/* Centro: input ou indicador */}
        <div className="console-well px-3 py-3 min-h-[64px] flex items-center">
          <div className="w-full">{center}</div>
        </div>

        {/* Direita: botões grandes */}
        <div className="flex flex-col gap-2 items-stretch min-w-[120px]">
          {showNext ? (
            <TactileButton variant="primary" size="lg" onClick={onNext} className="w-full">
              Próximo <ChevronRight className="h-5 w-5" />
            </TactileButton>
          ) : !confirmHidden ? (
            <TactileButton
              variant="primary"
              size="lg"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className="w-full"
            >
              {confirmLabel}
            </TactileButton>
          ) : (
            <div className="h-14" />
          )}
        </div>
      </div>
    </div>
  );
}
