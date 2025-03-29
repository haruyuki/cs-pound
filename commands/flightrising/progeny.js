import { handleProgeny } from "../../utils/progeny.js"

/**
 * Command handler for the progeny subcommand
 * @param {Object} interaction - Discord interaction object
 * @param {number} dragon1 - ID of the first dragon
 * @param {number} dragon2 - ID of the second dragon
 * @param {number} element - Element ID
 * @returns {Promise<void>}
 */
export async function progenyCommand(interaction, dragon1, dragon2, element) {
    await interaction.deferReply()
    await handleProgeny(interaction, dragon1, dragon2, element)
}
