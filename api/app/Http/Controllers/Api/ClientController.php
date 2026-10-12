<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::orderBy('name');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->string('search') . '%');
        }

        return ClientResource::collection($query->paginate(15));
    }

    public function store(ClientRequest $request)
    {
        return new ClientResource(Client::create($request->validated()));
    }

    public function show(Client $client)
    {
        return new ClientResource($client);
    }

    public function update(ClientRequest $request, Client $client)
    {
        $client->update($request->validated());

        return new ClientResource($client);
    }

    public function destroy(Client $client)
    {
        if ($client->quotations()->exists() || $client->invoices()->exists()) {
            return response()->json(['message' => 'Cannot delete a client with quotations or invoices.'], 422);
        }

        $client->delete();

        return response()->json(null, 204);
    }
}
