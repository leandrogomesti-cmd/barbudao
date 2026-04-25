import fs from 'fs';
import path from 'path';

function main() {
  const filePath = path.join(__dirname, '../docs/n8n/01. DelPierro Chatwoot.json');
  const workflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Create new node
  const salvarClienteNode = {
    "parameters": {
      "operation": "executeQuery",
      "query": "INSERT INTO public.contatos_erp (nome, telefone, cargo, store_id, ativo) SELECT '{{$('Webhook').item.json.sender.name}}', '{{$('Info').item.json.telefone}}', 'salvo pela agente de ia', 5, true WHERE NOT EXISTS (SELECT 1 FROM public.contatos_erp WHERE telefone = '{{$('Info').item.json.telefone}}');",
      "options": {}
    },
    "type": "n8n-nodes-base.postgres",
    "typeVersion": 2.6,
    "position": [
      -3760,
      1952
    ],
    "id": "c1613b41-db43-4c5e-85a7-96a24be51bf1",
    "name": "Salvar Cliente BD",
    "executeOnce": true,
    "alwaysOutputData": true,
    "credentials": {
      "postgres": {
        "id": "dxKiCg78jqbypAcM",
        "name": "Postgres account - Clientes"
      }
    }
  };

  // Ensure node doesn't already exist
  const existingNodeIndex = workflow.nodes.findIndex((n: any) => n.name === 'Salvar Cliente BD');
  if (existingNodeIndex >= 0) {
    workflow.nodes[existingNodeIndex] = salvarClienteNode;
  } else {
    workflow.nodes.push(salvarClienteNode);
  }

  // Update connections
  workflow.connections["Info"] = {
    "main": [
      [
        {
          "node": "Salvar Cliente BD",
          "type": "main",
          "index": 0
        }
      ]
    ]
  };

  workflow.connections["Salvar Cliente BD"] = {
    "main": [
      [
        {
          "node": "Detalhes conversa Chatwoot",
          "type": "main",
          "index": 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
  console.log('n8n workflow patched successfully!');
}

main();
