<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RevenueLicense;
use Illuminate\Http\Request;

class RevenueLicenseController extends Controller
{
    public function index(Request $request)
    {
        $query = RevenueLicense::with(['vehicle:id,vehicle_number', 'attachments']);
        if ($request->has('status')) $query->where('status', $request->status);
        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'license_number' => 'required|string',
            'issue_date' => 'required|date',
            'expiry_date' => 'required|date|after:issue_date',
            'fee' => 'required|numeric',
            'status' => 'required|in:active,expired',
            'notes' => 'nullable|string',
        ]);
        $license = RevenueLicense::create($validated);

        if ($request->hasFile('attachments')) {
            $license->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'License added', 'data' => $license], 201);
    }

    public function show(RevenueLicense $revenue_license)
    {
        $revenue_license->load('vehicle');
        return response()->json($revenue_license);
    }

    public function update(Request $request, RevenueLicense $revenueLicense)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'license_number' => 'sometimes|required|string',
            'issue_date' => 'sometimes|required|date',
            'expiry_date' => 'sometimes|required|date',
            'fee' => 'sometimes|required|numeric',
            'status' => 'sometimes|required|in:active,expired',
            'notes' => 'nullable|string',
        ]);
        $revenueLicense->update($validated);

        if ($request->hasFile('attachments')) {
            $revenueLicense->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'License updated', 'data' => $revenueLicense]);
    }

    public function destroy(RevenueLicense $revenue_license)
    {
        $revenue_license->delete();
        return response()->json(['message' => 'Revenue license deleted']);
    }
}
