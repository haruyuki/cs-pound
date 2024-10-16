import * as fs from "node:fs"
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"
import puppeteer, { launch } from "rebrowser-puppeteer"

import { getOpeningTime, HEADERS, login } from "../../lib.js"
import { Logger } from "../../logger.js"

const POUND_URL =
    "https://www.chickensmoothie.com/accounts/viewgroup.php?userid=2887&groupid=5813&pageSize=3000"

let imageGenerated = false
let imageGenerating = false
let imageStage = 1

export const data = new SlashCommandBuilder()
    .setName("poundpets")
    .setDescription("Get the list of pets in the pound.")

export async function execute(interaction) {
    if (imageGenerated) {
        await interaction.reply({
            files: [
                new AttachmentBuilder("raresPlus.png", {
                    name: "raresPlus.png",
                }),
                new AttachmentBuilder("rares.png", { name: "rares.png" }),
            ],
        })
        return
    }
    if (imageGenerating) {
        await interaction.reply(
            "Another user already ran this command!\nPlease try again in a minute.",
        )
        return
    }

    imageGenerating = true

    const openingDetails = await getOpeningTime()
    if (openingDetails.openingType === "The Lost and Found") {
        await interaction.reply("The next opening is not the Pound!")
        imageGenerating = false
        return
    } else if (openingDetails.openingType === "The Pound") {
        await interaction.reply(
            "An image cannot be generated while the pound is still open!",
        )
        imageGenerating = false
        return
    }

    await interaction.deferReply()

    const loggedIn = await login()

    if (!loggedIn) {
        Logger.error("Failed to log in to ChickenSmoothie.")
        return
    }
    const browser = await launch({ userDataDir: "./chrome_data" })
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders(HEADERS)
    await page.goto(POUND_URL)

    const rarePets = await page.evaluate(() => {
        let allPets = []
        document.querySelectorAll("dl.pet").forEach((pet) => {
            const petRarity = pet.querySelector(".pet-rarity img")
                ? pet.querySelector(".pet-rarity img").alt
                : null
            if (
                petRarity === "Rare" ||
                petRarity === "Very rare" ||
                petRarity === "Extremely rare" ||
                petRarity === "OMG so rare!"
            ) {
                const petAdoption =
                    pet.querySelector(".pet-adoption-date").textContent
                const petImageURL = new URL(pet.querySelector("dt a img").src)
                petImageURL.searchParams.set("bg", "e0f6b2")
                const petImage = petImageURL.toString()
                allPets.push([petAdoption, petRarity, petImage])
            }
        })
        return allPets
    })
    await browser.close()

    imageStage = 2
    const rares = await generateImage(
        rarePets.filter((pet) => pet[1] === "Rare"),
        "rares",
    )
    const raresPlus = await generateImage(
        rarePets.filter((pet) => pet[1] !== "Rare"),
        "raresPlus",
    )

    const raresImage = new AttachmentBuilder(rares, { name: "rares.png" })
    const raresPlusImage = new AttachmentBuilder(raresPlus, {
        name: "raresPlus.png",
    })
    imageGenerated = true

    interaction.editReply({ files: [raresPlusImage, raresImage] })

    Logger.debug(
        `Deleting image after: ${openingDetails.timeRemaining} minutes`,
    )
    setTimeout(async () => {
        try {
            // Delete the first file if it exists
            fs.unlink(rares, (err) => {
                if (err) {
                    Logger.error(err)
                } else Logger.info(`${rares} was deleted`)
            })
            console.log(`${rares} was deleted`)

            // Delete the second file if it exists
            fs.unlink(raresPlus, (err) => {
                if (err) {
                    Logger.error(err)
                } else Logger.info(`${raresPlus} was deleted`)
            })
            console.log(`${raresPlus} was deleted`)
        } catch (error) {
            console.error("Error deleting files:", error)
        }
        imageGenerated = false
        imageGenerating = false
        imageStage = 1
    }, openingDetails.timeRemaining * 60000)
}

async function generateImage(pets, filename = "poundpets") {
    const browser = await puppeteer.launch({
        userDataDir: "./chrome_data",
        args: ["--disable-lcd-text"],
    })
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders(HEADERS)
    const pageWidth = 1920

    await page.setViewport({ width: pageWidth, height: 800 })

    await page.setContent(`
        <html lang="en">
        <head>
            <style>
                body {
                    background-color: #e0f6b2;
                    margin: 0;
                    padding: 0;
                    font-family: Verdana, Helvetica, Arial, sans-serif;
                    font-size: 12px;
                }
                .container {
                    width: ${pageWidth}px;
                }
                ul {
                    display: flex;
                    flex-wrap: wrap;
                    list-style-type: none;
                    padding: 0;
                    margin: 0;
                    align-items: flex-end;
                    line-height: 1.3em;
                }
                .pet-details {
                    text-align: center;
                    margin: 4px;
                    color: #202020;
                }
                .rarity-bar {
                    width: 111px;
                    height: 30px;
                    background-image: url("https://www.chickensmoothie.com/img/rarity/starbars-light-2x.png");
                    background-repeat: no-repeat;
                    background-size: 111px;
                }
                .rare {
                    background-position: 0 -210px;
                }
                .very-rare {
                    background-position: 0 -240px;
                }
                .extremely-rare {
                    background-position: 0 -270px;
                }
                .omg-so-rare {
                    background-position: 0 -300px;
                }
            </style>
            <title>Pound Pets</title>
        </head>
        <body>
            <div class="container">
                <ul>
                    ${pets
                        .map(
                            (pet) => `
                        <li class="pet-details">
                            <img src="${pet[2]}" alt="" />
                            <div class="pet-adoption">${pet[0]}</div>
                            <div class="pet-rarity">
                                <img class="rarity-bar ${getRarityImage(pet[1])}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" alt=""/>
                            </div>
                        </li>
                    `,
                        )
                        .join("")}
                </ul>
            </div>
            
            <script>
                document.addEventListener("DOMContentLoaded", function() {
                    const petImages = document.querySelectorAll('.pet-image');

                    petImages.forEach(img => {
                        img.onload = function() {
                            img.style.width = img.naturalWidth + 'px';
                            img.style.height = img.naturalHeight + 'px';
                        };
                    });
                });
            </script>
        </body>
        </html>
    `)
    await page.waitForSelector("img")

    await page.screenshot({
        path: `${filename}.png`,
        fullPage: true,
    })

    await browser.close()
    return `${filename}.png`
}

function getRarityImage(rarity) {
    switch (rarity) {
        case "Rare":
            return "rare"
        case "Very rare":
            return "very-rare"
        case "Extremely rare":
            return "extremely-rare"
        case "OMG so rare!":
            return "omg-so-rare"
    }
}
