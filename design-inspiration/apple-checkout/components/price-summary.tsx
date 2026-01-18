interface PriceSummaryProps {
  basePrice: number
  options: Array<{ name: string; price: number }>
  totalPrice: number
}

export default function PriceSummary({ basePrice, options, totalPrice }: PriceSummaryProps) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex justify-between mb-2">
        <span className="text-gray-500">Base price</span>
        <span className="font-medium">${basePrice.toLocaleString()}</span>
      </div>

      {options.map(
        (option, index) =>
          option.price > 0 && (
            <div key={index} className="flex justify-between mb-2">
              <span className="text-gray-500">{option.name} upgrade</span>
              <span className="font-medium">+${option.price.toLocaleString()}</span>
            </div>
          ),
      )}

      <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-2">
        <span className="text-lg font-medium">Total</span>
        <span className="text-xl font-medium">${totalPrice.toLocaleString()}</span>
      </div>
    </div>
  )
}
