<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['vehicle:id,vehicle_number', 'recorder:id,name']);
        if ($request->has('vehicle_id')) $query->where('vehicle_id', $request->vehicle_id);
        if ($request->has('expense_type')) $query->where('expense_type', $request->expense_type);
        return response()->json($query->latest('date')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        $validated['recorded_by'] = $request->user()->id;
        $expense = Expense::create($validated);

        if ($request->hasFile('attachments')) {
            $expense->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Expense recorded successfully', 'data' => $expense], 201);
    }

    public function show(Expense $expense)
    {
        $expense->load(['vehicle', 'recorder']);
        return response()->json($expense);
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'expense_type' => 'sometimes|required|string',
            'amount' => 'sometimes|required|numeric',
            'date' => 'sometimes|required|date',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        $expense->update($validated);

        if ($request->hasFile('attachments')) {
            $expense->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Expense updated successfully', 'data' => $expense]);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return response()->json(['message' => 'Expense deleted']);
    }
}
