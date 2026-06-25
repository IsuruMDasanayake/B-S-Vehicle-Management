<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SparePart;
use Illuminate\Http\Request;

class SparePartController extends Controller
{
    public function index(Request $request)
    {
        $query = SparePart::with(['vendor:id,name']);
        // Alert low stock
        if ($request->has('low_stock')) {
            $query->whereRaw('quantity <= min_stock_alert');
        }
        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'part_name' => 'required|string',
            'part_number' => 'required|string|unique:spare_parts',
            'quantity' => 'required|integer|min:0',
            'min_stock_alert' => 'required|integer|min:0',
            'vendor_id' => 'nullable|exists:vendors,id',
            'purchase_cost' => 'nullable|numeric',
            'location' => 'nullable|string',
            'description' => 'nullable|string',
        ]);
        $spare_part = SparePart::create($validated);

        if ($request->hasFile('attachments')) {
            $spare_part->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Spare part added', 'data' => $spare_part], 201);
    }

    public function show(SparePart $spare_part)
    {
        $spare_part->load('vendor');
        return response()->json($spare_part);
    }

    public function update(Request $request, SparePart $spare_part)
    {
        $validated = $request->validate([
            'part_name' => 'sometimes|required|string',
            'part_number' => 'sometimes|required|unique:spare_parts,part_number,'.$spare_part->id,
            'quantity' => 'sometimes|required|integer|min:0',
            'min_stock_alert' => 'sometimes|required|integer|min:0',
            'vendor_id' => 'nullable|exists:vendors,id',
            'purchase_cost' => 'nullable|numeric',
            'location' => 'nullable|string',
            'description' => 'nullable|string',
        ]);
        $spare_part->update($validated);

        if ($request->hasFile('attachments')) {
            $spare_part->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Spare part updated', 'data' => $spare_part]);
    }

    public function destroy(SparePart $spare_part)
    {
        $spare_part->delete();
        return response()->json(['message' => 'Spare part deleted']);
    }
}
