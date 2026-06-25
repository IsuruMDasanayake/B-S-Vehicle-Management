<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SparePart extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['part_name','part_number','quantity','min_stock_alert','vendor_id','purchase_cost','location','description'];
    protected $casts = ['purchase_cost'=>'decimal:2'];
    public function vendor() { return $this->belongsTo(Vendor::class); }
}
