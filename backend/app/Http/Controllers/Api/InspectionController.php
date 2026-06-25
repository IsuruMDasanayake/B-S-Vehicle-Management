<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inspection;
use Illuminate\Http\Request;

class InspectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validated();
        $inspection = Inspection::create($validated);

        if ($request->hasFile('attachments')) {
            $inspection->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Inspection logged', 'data' => $inspection], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Inspection $inspection)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Inspection $inspection)
    {
        $validated = $request->validated();
        $inspection->update($validated);

        if ($request->hasFile('attachments')) {
            $inspection->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Inspection updated', 'data' => $inspection]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Inspection $inspection)
    {
        //
    }
}
