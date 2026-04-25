import { TrelloClient } from "./trello-client";

export default function TrelloPage() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl">Importar dados do Trello</h1>
      </div>
      <div className="mt-4">
        <TrelloClient />
      </div>
    </div>
  );
}
