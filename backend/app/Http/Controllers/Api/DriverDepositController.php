<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverDeposit;
use App\Models\DailyRideLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DriverDepositController extends Controller
{
    public function index(Request $request)
    {
        $query = DriverDeposit::with('attachments');

        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }

        $deposits = $query->orderBy('date', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $deposits]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'driver_id' => 'required|exists:drivers,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $validated['status'] = 'pending';

        $deposit = DriverDeposit::create($validated);

        if ($request->hasFile('receipt')) {
            $deposit->saveAttachments($request->file('receipt'), 'attachments', 'deposit_receipt');
        }

        return response()->json(['message' => 'Deposit submitted successfully', 'data' => $deposit->load('attachments')], 201);
    }

    public function dailySummary(Request $request)
    {
        $request->validate(['driver_id' => 'required|exists:drivers,id']);
        $driverId = $request->driver_id;

        // Get all dates where there's a log or a deposit
        $logDates = DailyRideLog::where('driver_id', $driverId)->pluck('date')->map(function($date) {
            return \Carbon\Carbon::parse($date)->format('Y-m-d');
        })->toArray();
        
        $depositDates = DriverDeposit::where('driver_id', $driverId)->pluck('date')->map(function($date) {
            return \Carbon\Carbon::parse($date)->format('Y-m-d');
        })->toArray();
        
        $allDates = array_unique(array_merge($logDates, $depositDates));
        rsort($allDates); // descending

        $summary = [];

        foreach ($allDates as $date) {
            $totalCashOnHand = DailyRideLog::where('driver_id', $driverId)
                ->whereDate('date', $date)
                ->sum('cash_on_hand');

            $totalDeposited = DriverDeposit::where('driver_id', $driverId)
                ->whereDate('date', $date)
                ->sum('amount');

            $summary[] = [
                'date' => $date,
                'total_cash_on_hand' => round((float)$totalCashOnHand, 2),
                'total_deposited' => round((float)$totalDeposited, 2),
                'balance' => round((float)($totalCashOnHand - $totalDeposited), 2)
            ];
        }

        return response()->json(['data' => $summary]);
    }
}
