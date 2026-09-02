import { pressureSnapshot } from "@/lib/traffic/gate";
import { TrafficStrip } from "@/components/traffic-strip";

/** Lê a pressão do acervo no servidor — em cache curto, para o cabeçalho não
 *  virar uma consulta a mais em cada página. */
export async function TrafficBanner() {
  return <TrafficStrip pressure={await pressureSnapshot()} />;
}
