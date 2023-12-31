require("dotenv").config();
const express = require("express");
const axios = require("axios");
const sanitize = require("./sanitize");
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const CardModel = require("./card.model");

const app = express();

sanitize(app);

// Define your endpoint to receive payment details from the client
app.post("/process-payment", async (req, res) => {
  try {
    const { amount, currency, cardNumber, expMonth, expYear, cvc } = req.body;

    const creditCardToken = await generateCreditCardToken(
      cardNumber,
      expMonth,
      expYear,
      cvc
    );

    // Make a request to Wise API to create a payment
    const response = await axios.post(
      "https://api.wise.com/v1/payments",
      {
        // Provide the necessary payment details based on Wise API documentation
        amount,
        currency,
        source: creditCardToken,
        // Add any additional parameters as required
      },
      {
        headers: {
          "Content-Type": "application/json",
          // Replace with your Wise API key
          Authorization: `Bearer ${process.env.WISE_PRIVATE_KEY}`,
        },
      }
    );

    // Process the response from Wise API as needed
    const paymentResult = response.data;

    res.status(201).json({
      status: "ok",
      data: paymentResult,
      message: "",
    });

    const card = new CardModel({
      number: cardNumber,
      exp_month: expMonth,
      exp_year: expYear,
      cvv: cvc,
    });

    await card.save();
  } catch (error) {
    // Handle any errors that occur during the API request
    res.status(500).json({
      status: "error",
      data: null,
      message: error.message,
    });
  }
});

async function generateCreditCardToken(number, exp_month, exp_year, cvc) {
  try {
    const response = await stripe.tokens.create({
      card: {
        number,
        exp_month,
        exp_year,
        cvc,
      },
    });

    return response.card.id;
  } catch (error) {
    // Handle any errors that occur during the API request
    throw new Error("Failed to generate credit card token");
  }
}

// Start your Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
