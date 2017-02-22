var computeSalary = (function () {
	function sum(a, b) {
		return a + b;
	}

	function toSuperGross(gross) {
		return gross * 1.34;
	}

	function getHealthTax(gross) {
		return gross * 0.045;
	}

	function getSocialTax(gross) {
		return Math.min(gross * 0.065, 112928);
	}

	function getEmployerHealthTax(gross) {
		return gross * 0.9;
	}

	function getEmployerSocialTax(gross) {
		return gross * 0.25;
	}

	function getTaxDiscount(chapters) {
		var discounts = {
			'poplatnik': 2070,
			'ztp': 1345,
			'student': 335,
			'invalida': 210,
			'invalida3': 420,
			'partner': 2070,
			'invalidniPartner': 2070
		};

		function discountMapper(chapter) {
			if (typeof discounts[chapter] === 'undefined') {
				throw new Error('Unknown chapter: ' + chapter);
			}

			return discounts[chapter];
		}

		return chapters.map(discountMapper).reduce(sum, 0);
	}

	function getChidlrenTaxDiscount(childrenCount, disabledChildrenCount) {
		function getChildDiscount(order, isInvalid) {
			var base = 0;
			if (order === 1) base = 1117;
			if (order === 2) base = 1617;
			if (order >= 3) base = 2017;
			return (isInvalid ? 2 : 1) * base;
		}

		var discount = 0;
		for (var i = 1; i <= childrenCount; i++) {
			discount += getChildDiscount(i, i <= disabledChildrenCount);
		}
		return discount;
	}


	function getIncomeTax(grossSalary, taxBands, discounts) {
		function createTaxMapper(taxBase) {
			var taxed = 0;

			return function (band) {
				var limit = band[0];
				var rate = band[1];
				var tax = 0;

				if (taxed >= taxBase) {
					// everything is taxed
					return 0;
				}

				if (limit < taxBase) {
					// band fully fits into tax base
					var incrementToTax = limit - taxed;
					taxed += incrementToTax;
					tax = incrementToTax * rate;
					return tax;
				}

				// the rest
				var remainder = taxBase - taxed;
				tax = remainder * rate;
				taxed += remainder;

				return tax;
			}
		};

		var superGrossSalary = toSuperGross(grossSalary);

		var bandedIncomeTaxes = taxBands.map(createTaxMapper(superGrossSalary));
		var baseIncomeTax = bandedIncomeTaxes.reduce(sum);
		var taxDiscount = getTaxDiscount(discounts.chapters || []);
		var childrenDiscount = getChidlrenTaxDiscount(discounts.childrenCount, discounts.disabledChildrenCount);
		var total = [
				baseIncomeTax,
				-taxDiscount,
				-childrenDiscount
			].reduce(sum);

		if (total < -5025) total = -5025; // max bonus

		return {
			base: superGrossSalary,
			breakdown: taxBands.reduce(function (obj, band, i) {
				var rate = band[1] * 100;
				obj[rate + '%'] = bandedIncomeTaxes[i];
				return obj;
			}, {}),
			taxTotal: baseIncomeTax,
			discount: taxDiscount,
			childrenDiscount: childrenDiscount,
			total: total
		}
	}

	function computeNetSalary(taxBands, grossSalary, discounts) {
		var healthTax = getHealthTax(grossSalary);
		var socialTax = getSocialTax(grossSalary);
		var employerHealthTax = getEmployerHealthTax(grossSalary);
		var employerSocialTax = getEmployerSocialTax(grossSalary);
		var incomeTax = getIncomeTax(grossSalary, taxBands, discounts);

		return {
			grossSalary: grossSalary,
			healthTax: healthTax,
			socialTax: socialTax,
			employerHealthTax: employerHealthTax,
			employerSocialTax: employerSocialTax,
			incomeTax: incomeTax,
			total: [
				grossSalary,
				-healthTax,
				-socialTax,
				-incomeTax.total
			].reduce(sum)
		}
	}

	var WTF = 1.34;
	var currentBands = [
		[toSuperGross(112928), 0.15],
		[Number.MAX_SAFE_INTEGER, 0.22]
	];

	var newBands = [
		[toSuperGross(30000), 0.12],
		[toSuperGross(40000), 0.15],
		[toSuperGross(50000), 0.25],
		[Number.MAX_SAFE_INTEGER, 0.32]
	];

	return function (grossSalary, discounts) {
		return {
		  current: computeNetSalary(currentBands, grossSalary, discounts),
			new: computeNetSalary(newBands, grossSalary, discounts)
		}
	}
})();

/* SAMPLE
 *
var grossSalary = 100000;

var discounts = {
	chapters: ['poplatnik'],
	childrenCount: 1,
	disabledChildrenCount: 0
};

var result = computeSalary(grossSalary, discounts);

console.log(JSON.stringify(result, null, 2));
//*/

