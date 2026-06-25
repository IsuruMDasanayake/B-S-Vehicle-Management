<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InsurancePolicy;
use Illuminate\Http\Request;

class InsurancePolicyController extends Controller
{
    public function index(Request $request)
    {
        $query = InsurancePolicy::with(['vehicle:id,vehicle_number', 'attachments']);
        if ($request->has('status')) $query->where('status', $request->status);
        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'policy_number' => 'required|unique:insurance_policies',
            'insurance_company' => 'required|string',
            'coverage_type' => 'required|string',
            'start_date' => 'required|date',
            'expiry_date' => 'required|date|after:start_date',
            'premium_amount' => 'required|numeric',
            'status' => 'required|in:active,expired,cancelled',
            'notes' => 'nullable|string',
        ]);
        $policy = InsurancePolicy::create($validated);

        if ($request->hasFile('attachments')) {
            $policy->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Policy added', 'data' => $policy], 201);
    }

    public function show(InsurancePolicy $insurance_policy)
    {
        $insurance_policy->load('vehicle');
        return response()->json($insurance_policy);
    }

    public function update(Request $request, InsurancePolicy $insurance_policy)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'policy_number' => 'sometimes|required|unique:insurance_policies,policy_number,'.$insurance_policy->id,
            'insurance_company' => 'sometimes|required|string',
            'coverage_type' => 'sometimes|required|string',
            'start_date' => 'sometimes|required|date',
            'expiry_date' => 'sometimes|required|date',
            'premium_amount' => 'sometimes|required|numeric',
            'status' => 'sometimes|required|in:active,expired,cancelled',
            'notes' => 'nullable|string',
        ]);
        $insurance_policy->update($validated);

        if ($request->hasFile('attachments')) {
            $insurance_policy->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Policy updated', 'data' => $insurance_policy]);
    }

    public function destroy(InsurancePolicy $insurance_policy)
    {
        $insurance_policy->delete();
        return response()->json(['message' => 'Policy deleted']);
    }
}
