<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrEmployeeAsset;
use Illuminate\Http\Request;

class HrEmployeeAssetController extends Controller
{
    public function index(Request $request, $employee_id)
    {
        $assets = HrEmployeeAsset::where('hr_employee_id', $employee_id)->orderBy('assigned_date', 'desc')->get();
        return response()->json($assets);
    }

    public function store(Request $request, $employee_id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'asset_id' => 'nullable|string|max:255',
            'assigned_date' => 'required|date',
            'status' => 'required|in:assigned,returned,damaged',
        ]);

        $asset = HrEmployeeAsset::create(array_merge($validated, ['hr_employee_id' => $employee_id]));

        return response()->json(['message' => 'Asset assigned', 'data' => $asset], 201);
    }

    public function update(Request $request, $employee_id, $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'asset_id' => 'nullable|string|max:255',
            'assigned_date' => 'sometimes|required|date',
            'status' => 'sometimes|required|in:assigned,returned,damaged',
        ]);

        $asset = HrEmployeeAsset::where('hr_employee_id', $employee_id)->findOrFail($id);
        $asset->update($validated);

        return response()->json(['message' => 'Asset updated', 'data' => $asset]);
    }

    public function destroy($employee_id, $id)
    {
        $asset = HrEmployeeAsset::where('hr_employee_id', $employee_id)->findOrFail($id);
        $asset->delete();
        return response()->json(['message' => 'Asset deleted']);
    }
}
